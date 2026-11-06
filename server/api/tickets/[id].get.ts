import { getRouterParam } from 'h3'
import { getTicket } from '../../services/ticket.service'
import { apiError } from '../../utils/errors'
import { defineApiHandler, requirePermission } from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'tickets:read:own')
  const ticketId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')
  }
  const ticket = await getTicket(auth.user, ticketId)
  return { data: ticket }
})
