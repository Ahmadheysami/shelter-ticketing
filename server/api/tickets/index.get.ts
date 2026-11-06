import { ticketListQuerySchema } from '../../../shared/validation'
import { listTickets } from '../../services/ticket.service'
import {
  defineApiHandler,
  enforceRateLimit,
  parseQuery,
  requirePermission,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'tickets:read:own')
  enforceRateLimit(event, `tickets:list:${auth.user.id}`, 120, 60 * 1000)
  const query = parseQuery(event, ticketListQuerySchema)
  const data = await listTickets(auth.user, query)
  return { data }
})
