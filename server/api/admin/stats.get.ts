import { statsQuerySchema } from '../../../shared/validation'
import { getAdminStats } from '../../services/admin.service'
import {
  defineApiHandler,
  parseQuery,
  requirePermission,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  requirePermission(context, 'dashboard:admin')
  const query = parseQuery(event, statsQuerySchema)
  const stats = await getAdminStats(query.days)
  return { data: stats }
})
