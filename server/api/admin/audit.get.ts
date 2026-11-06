import { auditListQuerySchema } from '../../../shared/validation'
import { listAuditLogs } from '../../services/admin.service'
import {
  defineApiHandler,
  parseQuery,
  requirePermission,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  requirePermission(context, 'audit:read')
  const query = parseQuery(event, auditListQuerySchema)
  const data = await listAuditLogs(query)
  return { data }
})
