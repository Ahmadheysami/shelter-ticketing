import { setResponseStatus } from 'h3'
import { createTicketSchema } from '../../../shared/validation'
import { createTicket } from '../../services/ticket.service'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requirePermission,
} from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'tickets:create')
  enforceRateLimit(
    event,
    `tickets:create:${auth.user.id}`,
    10,
    60 * 60 * 1000,
    'تعداد تیکت‌های ثبت‌شده در این بازه بیش از حد مجاز است.',
  )
  const input = await readJsonBody(event, createTicketSchema)
  const ticket = await createTicket(auth.user, input, context.ipHash)
  setResponseStatus(event, 201)
  return { data: ticket }
})
