import { getCookie } from 'h3'
import { loginSchema } from '../../../shared/validation'
import { loginUser } from '../../services/auth.service'
import { setSessionCookie } from '../../utils/auth'
import { defineApiHandler, enforceRateLimit, readJsonBody } from '../../utils/http'
import {
  MFA_CHALLENGE_TTL_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from '../../utils/session-cookie'

export default defineApiHandler(async (event, context) => {
  const input = await readJsonBody(event, loginSchema)
  enforceRateLimit(
    event,
    `login:ip:${context.ipHash ?? 'unknown'}`,
    10,
    15 * 60 * 1000,
    'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
  )
  enforceRateLimit(
    event,
    `login:email:${input.email}`,
    5,
    15 * 60 * 1000,
    'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
  )

  const outcome = await loginUser({
    email: input.email,
    password: input.password,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    previousToken: getCookie(event, SESSION_COOKIE) ?? null,
  })

  setSessionCookie(
    event,
    outcome.token,
    outcome.result.mfaRequired ? MFA_CHALLENGE_TTL_MS : SESSION_TTL_MS,
  )
  return { data: outcome.result }
})
