import { changePasswordSchema } from '../../../shared/validation'
import { changePassword } from '../../services/auth.service'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requireAuth,
} from '../../utils/http'
import { invalidateUserSockets } from '../../utils/realtime'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  enforceRateLimit(event, `change-password:${auth.user.id}`, 5, 60 * 60 * 1000)
  const input = await readJsonBody(event, changePasswordSchema)
  await changePassword({
    userId: auth.user.id,
    sessionId: auth.session.id,
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    ipHash: context.ipHash,
  })
  invalidateUserSockets(auth.user.id)
  return { data: { success: true } }
})
