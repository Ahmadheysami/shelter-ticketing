import { listAllActiveSessions } from '../../services/admin.service'
import { defineApiHandler, requirePermission } from '../../utils/http'

export default defineApiHandler(async (_event, context) => {
  requirePermission(context, 'sessions:read:all')
  const sessions = await listAllActiveSessions()
  return { data: { sessions } }
})
