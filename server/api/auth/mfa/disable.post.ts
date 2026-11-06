import { mfaDisableSchema } from '../../../../shared/validation'
import { disableMfa } from '../../../services/auth.service'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requireAuth,
} from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  enforceRateLimit(event, `mfa-disable:${auth.user.id}`, 5, 60 * 60 * 1000)
  const input = await readJsonBody(event, mfaDisableSchema)
  await disableMfa({
    userId: auth.user.id,
    sessionId: auth.session.id,
    password: input.password,
    secret: input.secret,
    code: input.code,
    ipHash: context.ipHash,
  })
  return { data: { success: true } }
})
