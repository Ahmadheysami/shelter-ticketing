import { getCookie } from 'h3'
import { logoutSession } from '../../services/auth.service'
import { clearSessionCookie } from '../../utils/auth'
import { defineApiHandler } from '../../utils/http'
import { invalidateUserSockets } from '../../utils/realtime'
import { SESSION_COOKIE } from '../../utils/session-cookie'

export default defineApiHandler(async (event, context) => {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    await logoutSession(token, context.ipHash, context.auth?.user.id)
  }
  if (context.auth) invalidateUserSockets(context.auth.user.id)
  clearSessionCookie(event)
  return { data: { success: true } }
})
