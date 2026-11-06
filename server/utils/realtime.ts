import type { Server } from 'socket.io'

// Socket.IO is a delivery channel only. Every caller emits after the database
// transaction has committed; clients always refetch authoritative data.

const globalForRealtime = globalThis as unknown as { __ticketingIo?: Server }

export function setRealtimeServer(io: Server): void {
  globalForRealtime.__ticketingIo = io
}

export function getRealtimeServer(): Server | null {
  return globalForRealtime.__ticketingIo ?? null
}

export interface TicketEvent {
  type: 'created' | 'updated' | 'message'
  ticketId: number
  requesterId: string
  assigneeId?: string | null
}

export function emitTicketEvent(event: TicketEvent): void {
  const io = getRealtimeServer()
  if (!io) return
  const payload = { ...event, at: new Date().toISOString() }
  io.to(`ticket:${event.ticketId}`).emit('ticket:changed', payload)
  io.to(`user:${event.requesterId}`).emit('ticket:changed', payload)
  if (event.assigneeId) io.to(`user:${event.assigneeId}`).emit('ticket:changed', payload)
  // Staff queues need every ticket event; the payload carries ids only and
  // each client refetches through authorized HTTP endpoints.
  io.to('staff').emit('ticket:changed', payload)
}

/** Revoke live sockets after logout, suspension, role change, or password change. */
export function invalidateUserSockets(userId: string): void {
  const io = getRealtimeServer()
  if (!io) return
  io.in(`user:${userId}`).disconnectSockets(true)
}
