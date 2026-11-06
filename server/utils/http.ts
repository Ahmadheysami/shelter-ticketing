import type { H3Event } from 'h3'
import {
  getCookie,
  getQuery,
  getRequestHeader,
  getRequestIP,
  readRawBody,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import type { z } from 'zod'
import { can } from '../../shared/domain'
import type { Permission } from '../../shared/domain'
import type { AuthContext } from './auth'
import { resolveAuth } from './auth'
import { hashIp, safeEqual } from './crypto'
import { getServerEnv, isLocalOriginAllowed } from './env'
import { ApiError, apiError } from './errors'
import { checkRateLimit } from './rate-limit'
import { CSRF_COOKIE, CSRF_HEADER, STEP_UP_WINDOW_MS } from './session-cookie'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const MAX_JSON_BYTES = 64 * 1024

function isMutating(event: H3Event) {
  return MUTATING_METHODS.has(event.method.toUpperCase())
}

/**
 * Compares the Origin header with the configured public origin. Browsers always
 * send Origin on cross-site state-changing requests; mismatches are rejected.
 */
function assertTrustedOrigin(event: H3Event) {
  const origin = getRequestHeader(event, 'origin')
  if (!origin) return
  const appUrl = getServerEnv().appUrl
  let expected: string
  try {
    expected = new URL(appUrl).origin
  } catch {
    return
  }
  if (origin !== expected && !isLocalOriginAllowed(origin, appUrl)) {
    apiError(403, 'ORIGIN_NOT_ALLOWED', 'درخواست از منبع مجاز ارسال نشده است.')
  }
}

/**
 * Double-submit CSRF: the token is issued in a readable cookie and must be
 * echoed in a header. Combined with SameSite=Lax and Origin checks.
 */
function assertCsrfToken(event: H3Event) {
  const cookieToken = getCookie(event, CSRF_COOKIE)
  const headerToken = getRequestHeader(event, CSRF_HEADER)
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    apiError(403, 'CSRF_INVALID', 'اعتبار درخواست منقضی شده است. صفحه را دوباره بارگذاری کنید.')
  }
}

export function enforceRateLimit(
  event: H3Event,
  key: string,
  limit: number,
  windowMs: number,
  message = 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
): void {
  const result = checkRateLimit(key, limit, windowMs)
  if (!result.allowed) {
    setResponseHeader(event, 'retry-after', result.retryAfterSeconds)
    apiError(429, 'RATE_LIMITED', message)
  }
}

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_form'
      if (!fields[key]) fields[key] = issue.message
    }
    throw new ApiError(422, 'VALIDATION_FAILED', 'اطلاعات واردشده معتبر نیست.', fields)
  }
  return result.data
}

export async function readJsonBody<T>(event: H3Event, schema: z.ZodType<T>): Promise<T> {
  const contentLength = Number(getRequestHeader(event, 'content-length') || '0')
  if (contentLength > MAX_JSON_BYTES) {
    apiError(413, 'PAYLOAD_TOO_LARGE', 'حجم درخواست بیش از حد مجاز است.')
  }
  const raw = await readRawBody(event, 'utf8')
  if (!raw) {
    apiError(400, 'INVALID_BODY', 'بدنه درخواست خالی است.')
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_JSON_BYTES) {
    apiError(413, 'PAYLOAD_TOO_LARGE', 'حجم درخواست بیش از حد مجاز است.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    apiError(400, 'INVALID_BODY', 'بدنه درخواست معتبر نیست.')
  }
  return parseWithSchema(schema, parsed)
}

export function parseQuery<T>(event: H3Event, schema: z.ZodType<T>): T {
  return parseWithSchema(schema, getQuery(event))
}

export interface ApiContext {
  auth: AuthContext | null
  ipHash: string | null
  userAgent: string | null
  requestId: string
}

export type ApiHandler<T> = (event: H3Event, context: ApiContext) => Promise<T>

export function requestIp(event: H3Event): string | undefined {
  return getRequestIP(event, { xForwardedFor: getServerEnv().trustProxy }) ?? undefined
}

export function clientMeta(event: H3Event) {
  const userAgent = (getRequestHeader(event, 'user-agent') || '').slice(0, 255) || null
  return { userAgent, ipHash: hashIp(requestIp(event)) }
}

/**
 * Wraps every API handler so CSRF, origin, auth resolution, error shape, and
 * logging are consistent. Unknown errors never leak internals to the client.
 */
export function defineApiHandler<T>(handler: ApiHandler<T>) {
  return defineEventHandler(async (event) => {
    const requestId = crypto.randomUUID()
    try {
      assertTrustedOrigin(event)
      if (isMutating(event)) assertCsrfToken(event)
      const auth = await resolveAuth(event)
      const meta = clientMeta(event)
      return await handler(event, { auth, ...meta, requestId })
    } catch (error) {
      if (error instanceof ApiError) {
        setResponseStatus(event, error.status)
        return {
          error: {
            code: error.code,
            message: error.message,
            ...(error.fields ? { fields: error.fields } : {}),
          },
        }
      }
      console.error(
        `[api:${requestId}] ${event.method} ${event.path} failed:`,
        error instanceof Error ? error.message : 'unknown error',
      )
      setResponseStatus(event, 500)
      return {
        error: {
          code: 'INTERNAL',
          message: 'خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.',
        },
      }
    }
  })
}

export function requireAuth(
  context: ApiContext,
  options: { allowIncompleteMfa?: boolean } = {},
): AuthContext {
  if (!context.auth) {
    apiError(401, 'UNAUTHENTICATED', 'برای ادامه باید وارد شوید.')
  }
  if (!options.allowIncompleteMfa) {
    if (!context.auth.session.mfaSatisfied) {
      apiError(401, 'MFA_REQUIRED', 'کد ورود دومرحله‌ای را وارد کنید.')
    }
  }
  return context.auth
}

export function requirePermission(context: ApiContext, permission: Permission): AuthContext {
  const auth = requireAuth(context)
  if (!can(auth.user.role, permission)) {
    apiError(403, 'FORBIDDEN', 'شما مجوز انجام این عملیات را ندارید.')
  }
  return auth
}

/** Critical actions must happen within a recent re-authentication window. */
export function requireStepUp(context: ApiContext): AuthContext {
  const auth = requireAuth(context)
  const reauthenticatedAt = auth.session.reauthenticatedAt
  if (!reauthenticatedAt || Date.now() - reauthenticatedAt.getTime() > STEP_UP_WINDOW_MS) {
    apiError(403, 'STEP_UP_REQUIRED', 'برای این عملیات باید هویت خود را دوباره تأیید کنید.')
  }
  return auth
}

