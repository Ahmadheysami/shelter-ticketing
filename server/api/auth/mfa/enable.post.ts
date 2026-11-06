import { mfaEnableSchema } from '../../../../shared/validation'
import { enableMfa } from '../../../services/auth.service'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requireAuth,
} from '../../../utils/http'
import { invalidateUserSockets } from '../../../utils/realtime'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context, { allowIncompleteMfa: true })
  enforceRateLimit(event, `mfa-enable:${auth.user.id}`, 10, 15 * 60 * 1000)
  const input = await readJsonBody(event, mfaEnableSchema)
  const result = await enableMfa({
    userId: auth.user.id,
    sessionId: auth.session.id,
    code: input.code,
    ipHash: context.ipHash,
  })
  // Refresh socket auth state: the staff member may now be fully signed in.
  invalidateUserSockets(auth.user.id)
  return { data: result }
})
