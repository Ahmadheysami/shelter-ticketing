import { getCookie } from 'h3'
import { mfaVerifySchema } from '../../../../shared/validation'
import { verifyMfaChallenge } from '../../../services/auth.service'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
} from '../../../utils/http'
import { invalidateUserSockets } from '../../../utils/realtime'
import { SESSION_COOKIE, SESSION_TTL_MS } from '../../../utils/session-cookie'
import { setSessionCookie } from '../../../utils/auth'
import { sha256 } from '../../../utils/crypto'
import { apiError } from '../../../utils/errors'

export default defineApiHandler(async (event, context) => {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) {
    apiError(401, 'UNAUTHENTICATED', 'برای تأیید دومرحله‌ای ابتدا وارد شوید.')
  }
  enforceRateLimit(
    event,
    `mfa-verify:ip:${context.ipHash ?? 'unknown'}`,
    15,
    15 * 60 * 1000,
    'تعداد تلاش‌های تأیید بیش از حد مجاز است.',
  )
  // The per-IP limit alone lets a distributed attacker brute-force a stolen
  // challenge cookie. Bind a stricter budget to the challenge itself.
  enforceRateLimit(
    event,
    `mfa-verify:challenge:${sha256(token)}`,
    10,
    15 * 60 * 1000,
    'تعداد تلاش‌های تأیید بیش از حد مجاز است.',
  )
  const input = await readJsonBody(event, mfaVerifySchema)
  const outcome = await verifyMfaChallenge({
    token,
    code: input.code,
    ipHash: context.ipHash,
  })
  setSessionCookie(event, outcome.token, SESSION_TTL_MS)
  invalidateUserSockets(outcome.result.user.id)
  return { data: outcome.result }
})
