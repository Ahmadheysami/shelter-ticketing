import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { isStaff } from '../../shared/domain'
import { canAccessTicket } from '../services/ticket.service'
import type { AuthUser } from '../utils/auth'
import { loadSessionByToken } from '../utils/auth'
import { getServerEnv } from '../utils/env'
import { checkRateLimit } from '../utils/rate-limit'
import { setRealtimeServer } from '../utils/realtime'
import { SESSION_COOKIE } from '../utils/session-cookie'

// Socket.IO shares the HTTP session source of truth. Clients can never choose
// their identity, and room access is authorized server-side per ticket.

const ATTACHED = Symbol.for('ticketing.socketio.attached')
type SocketHost = HttpServer & { [ATTACHED]?: boolean }

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function attach(httpServer: SocketHost): void {
  // The request hook runs on every request and the module can be re-evaluated
  // by dev HMR, so guard attachment on the server object itself.
  if (httpServer[ATTACHED]) return
  httpServer[ATTACHED] = true

  const env = getServerEnv()
  const allowedOrigin = new URL(env.appUrl).origin

  const io = new Server(httpServer, {
    path: '/socket.io',
    serveClient: false,
    maxHttpBufferSize: 10_000,
    allowRequest: (request, callback) => {
      const origin = request.headers.origin
      if (origin && origin !== allowedOrigin) {
        callback('origin not allowed', false)
        return
      }
      callback(null, true)
    },
  })
  setRealtimeServer(io)

  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE)
      if (!token) return next(new Error('UNAUTHENTICATED'))
      const loaded = await loadSessionByToken(token)
      if (!loaded) return next(new Error('UNAUTHENTICATED'))
      if (!loaded.context.session.mfaSatisfied) {
        return next(new Error('MFA_REQUIRED'))
      }
      socket.data.user = loaded.context.user
      socket.data.token = token
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser
    socket.join(`user:${user.id}`)
    // Staff queues subscribe to aggregate ticket events. The room is derived
    // from the verified session role, never from a client payload.
    if (isStaff(user.role)) socket.join('staff')

    socket.on('ticket:subscribe', async (payload: unknown, ack?: (response: unknown) => void) => {
      const rate = checkRateLimit(`socket-events:${socket.id}`, 60, 60_000)
      if (!rate.allowed) {
        ack?.({ ok: false, error: 'RATE_LIMITED' })
        return
      }
      const ticketId = Number((payload as { ticketId?: unknown } | null)?.ticketId)
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        ack?.({ ok: false, error: 'INVALID_PAYLOAD' })
        return
      }
      // Re-check the session on subscribe so a revoked/expired session cannot
      // join a ticket room between periodic sweeps.
      const token = socket.data.token as string | undefined
      const loaded = token ? await loadSessionByToken(token) : null
      if (!loaded || !loaded.context.session.mfaSatisfied) {
        ack?.({ ok: false, error: 'UNAUTHENTICATED' })
        socket.disconnect(true)
        return
      }
      socket.data.user = loaded.context.user
      const allowed = await canAccessTicket(loaded.context.user, ticketId)
      if (!allowed) {
        ack?.({ ok: false, error: 'FORBIDDEN' })
        return
      }
      await socket.join(`ticket:${ticketId}`)
      ack?.({ ok: true })
    })

    socket.on('ticket:unsubscribe', (payload: unknown) => {
      const ticketId = Number((payload as { ticketId?: unknown } | null)?.ticketId)
      if (!Number.isInteger(ticketId)) return
      socket.leave(`ticket:${ticketId}`)
    })
  })

  // Sessions expire, get revoked, or users get suspended while a socket is
  // open. Sweep periodically so a stale socket cannot keep receiving events.
  const sweep = setInterval(() => {
    for (const socket of io.sockets.sockets.values()) {
      const token = socket.data.token as string | undefined
      if (!token) continue
      loadSessionByToken(token)
        .then((loaded) => {
          if (!loaded || !loaded.context.session.mfaSatisfied) socket.disconnect(true)
        })
        .catch(() => socket.disconnect(true))
    }
  }, 60 * 1000)
  sweep.unref?.()
}

export default defineNitroPlugin((nitroApp) => {
  // Nitro 3 does not expose a "listen" hook. The first HTTP request carries the
  // underlying Node server on the event, which is the same server Socket.IO
  // must share for the same-origin /socket.io path to work.
  nitroApp.hooks.hook('request', (event) => {
    const socket = event.node.req.socket
    const server = socket?.server
    if (server) attach(server as SocketHost)
  })
})
