import { beginMfaSetup } from '../../../services/auth.service'
import { defineApiHandler, enforceRateLimit, requireAuth } from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context, { allowIncompleteMfa: true })
  enforceRateLimit(event, `mfa-setup:${auth.user.id}`, 5, 60 * 60 * 1000)
  const enrollment = await beginMfaSetup(auth.user.id)
  return { data: enrollment }
})
