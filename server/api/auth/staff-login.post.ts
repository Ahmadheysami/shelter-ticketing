import { getCookie } from 'h3'
import { staffLoginSchema } from '../../../shared/validation'
import { loginStaff } from '../../services/auth.service'
import { setSessionCookie } from '../../utils/auth'
import { normalizeStaffSecret, sha256 } from '../../utils/crypto'
import { defineApiHandler, enforceRateLimit, readJsonBody } from '../../utils/http'
import { MFA_CHALLENGE_TTL_MS, SESSION_COOKIE, SESSION_TTL_MS } from '../../utils/session-cookie'

// Staff (OWNER/ADMIN) entry point: the secret is the only credential.
export default defineApiHandler(async (event, context) => {
  const input = await readJsonBody(event, staffLoginSchema)
  enforceRateLimit(
    event,
    `staff-login:ip:${context.ipHash ?? 'unknown'}`,
    10,
    15 * 60 * 1000,
    'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
  )
  // Keyed by the secret hash so a single leaked key cannot be brute-forced
  // through other IPs without also hitting the per-secret limit.
  enforceRateLimit(
    event,
    `staff-login:key:${sha256(normalizeStaffSecret(input.secret))}`,
    5,
    15 * 60 * 1000,
    'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
  )

  const outcome = await loginStaff({
    secret: input.secret,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    previousToken: getCookie(event, SESSION_COOKIE) ?? null,
  })

  // Accounts that opted into TOTP get a short-lived challenge session first.
  setSessionCookie(
    event,
    outcome.token,
    outcome.result.mfaRequired ? MFA_CHALLENGE_TTL_MS : SESSION_TTL_MS,
  )
  return { data: outcome.result }
})
