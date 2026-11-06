import { reauthSchema } from '../../../shared/validation'
import { reauthenticate } from '../../services/auth.service'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requireAuth,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  enforceRateLimit(event, `reauth:${auth.user.id}`, 8, 15 * 60 * 1000)
  const input = await readJsonBody(event, reauthSchema)
  await reauthenticate({
    userId: auth.user.id,
    sessionId: auth.session.id,
    password: input.password,
    secret: input.secret,
    code: input.code,
    ipHash: context.ipHash,
  })
  return { data: { success: true } }
})
