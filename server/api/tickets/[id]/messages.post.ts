import { getRouterParam, setResponseStatus } from 'h3'
import { isStaff } from '../../../../shared/domain'
import { createMessageSchema } from '../../../../shared/validation'
import { addMessage } from '../../../services/ticket.service'
import { apiError } from '../../../utils/errors'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requireAuth,
} from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  const ticketId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')
  }
  enforceRateLimit(
    event,
    `tickets:reply:${auth.user.id}`,
    30,
    10 * 60 * 1000,
    'تعداد پیام‌های ارسالی بیش از حد مجاز است.',
  )
  const input = await readJsonBody(event, createMessageSchema)
  if (input.visibility === 'INTERNAL' && !isStaff(auth.user.role)) {
    apiError(403, 'FORBIDDEN', 'ارسال یادداشت داخلی برای کاربران مجاز نیست.')
  }
  const message = await addMessage(auth.user, ticketId, input, context.ipHash)
  setResponseStatus(event, 201)
  return { data: { message } }
})
