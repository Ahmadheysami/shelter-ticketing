import { getRouterParam } from 'h3'
import { isStaff } from '../../../shared/domain'
import { updateTicketSchema } from '../../../shared/validation'
import {
  updateTicketAsRequester,
  updateTicketAsStaff,
} from '../../services/ticket.service'
import { apiError } from '../../utils/errors'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requireAuth,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  const ticketId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')
  }
  enforceRateLimit(event, `tickets:update:${auth.user.id}`, 40, 10 * 60 * 1000)
  const input = await readJsonBody(event, updateTicketSchema)

  if (isStaff(auth.user.role)) {
    const status = await updateTicketAsStaff(auth.user, ticketId, input, context.ipHash)
    return { data: { status } }
  }

  if (input.priority !== undefined || input.assigneeId !== undefined) {
    apiError(403, 'FORBIDDEN', 'تغییر اولویت یا تخصیص تیکت برای شما مجاز نیست.')
  }
  if (!input.status) {
    apiError(422, 'INVALID_TRANSITION', 'فقط بستن یا بازگشایی تیکت برای شما مجاز است.')
  }
  if (input.status !== 'OPEN' && input.status !== 'CLOSED') {
    apiError(403, 'FORBIDDEN', 'تغییر وضعیت به این مقدار برای شما مجاز نیست.')
  }
  const status = await updateTicketAsRequester(
    auth.user,
    ticketId,
    input.status,
    context.ipHash,
  )
  return { data: { status } }
})
