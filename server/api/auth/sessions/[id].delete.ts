import { getRouterParam } from 'h3'
import { revokeSession } from '../../../services/session.service'
import { clearSessionCookie } from '../../../utils/auth'
import { apiError } from '../../../utils/errors'
import { defineApiHandler, requireAuth } from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  const id = getRouterParam(event, 'id')
  if (!id) apiError(404, 'SESSION_NOT_FOUND', 'نشست یافت نشد.')
  const result = await revokeSession({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    sessionId: id,
    currentSessionId: auth.session.id,
    ipHash: context.ipHash,
  })
  if (result.targetUserId === auth.user.id && id === auth.session.id) {
    clearSessionCookie(event)
  }
  return { data: { success: true } }
})
