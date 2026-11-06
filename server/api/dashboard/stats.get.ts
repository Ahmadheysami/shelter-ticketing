import { getUserDashboardStats } from '../../services/ticket.service'
import { defineApiHandler, requireAuth } from '../../utils/http'

export default defineApiHandler(async (_event, context) => {
  const auth = requireAuth(context)
  const stats = await getUserDashboardStats(auth.user)
  return { data: stats }
})
