import { getRouterParam } from 'h3'
import { revokeSession } from '../../../services/session.service'
import { apiError } from '../../../utils/errors'
import {
  defineApiHandler,
  requirePermission,
  requireStepUp,
} from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'sessions:read:all')
  requireStepUp(context)
  const id = getRouterParam(event, 'id')
  if (!id) apiError(404, 'SESSION_NOT_FOUND', 'نشست یافت نشد.')
  await revokeSession({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    sessionId: id,
    currentSessionId: auth.session.id,
    ipHash: context.ipHash,
  })
  return { data: { success: true } }
})
