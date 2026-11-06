import { resendVerification } from '../../services/auth.service'
import {
  defineApiHandler,
  enforceRateLimit,
  requireAuth,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context, { allowIncompleteMfa: true })
  enforceRateLimit(event, `resend-verification:${auth.user.id}`, 3, 60 * 60 * 1000)
  await resendVerification(auth.user.id)
  return { data: { success: true } }
})
