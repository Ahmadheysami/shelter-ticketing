import { listUserSessions } from '../../../services/session.service'
import { defineApiHandler, requireAuth } from '../../../utils/http'

export default defineApiHandler(async (_event, context) => {
  const auth = requireAuth(context)
  const sessions = await listUserSessions(auth.user.id, auth.session.id)
  return { data: { sessions } }
})
