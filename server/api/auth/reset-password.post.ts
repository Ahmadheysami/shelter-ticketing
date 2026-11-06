import { resetPasswordSchema } from '../../../shared/validation'
import { resetPassword } from '../../services/auth.service'
import { clearSessionCookie } from '../../utils/auth'
import { defineApiHandler, enforceRateLimit, readJsonBody } from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  enforceRateLimit(
    event,
    `reset:ip:${context.ipHash ?? 'unknown'}`,
    10,
    60 * 60 * 1000,
    'تعداد تلاش‌های بازیابی بیش از حد مجاز است.',
  )
  const input = await readJsonBody(event, resetPasswordSchema)
  await resetPassword({
    token: input.token,
    password: input.password,
    ipHash: context.ipHash,
  })
  // All sessions were revoked server-side; drop any stale browser cookie too.
  clearSessionCookie(event)
  return { data: { success: true } }
})
