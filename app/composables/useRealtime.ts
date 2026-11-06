import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client'

const SOCKET_OPTIONS: Partial<ManagerOptions & SocketOptions> = {
  path: '/socket.io',
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 10_000,
}

/**
 * Listens for ticket changes delivered to the current user (and to staff as a
 * whole) without subscribing to any specific ticket. The payload carries no
 * ticket content: callers refetch authorized data from the server.
 */
export function useRealtimeFeed() {
  const connected = ref(false)
  const changed = ref(0)
  let socket: Socket | null = null

  function connect(): void {
    socket = io(SOCKET_OPTIONS)
    socket.on('connect', () => {
      connected.value = true
    })
    socket.on('disconnect', () => {
      connected.value = false
    })
    socket.on('ticket:changed', () => {
      changed.value += 1
    })
    // Events emitted while offline are never replayed. Refetch on reconnect so
    // the list reconciles with the server instead of showing stale statuses.
    socket.io.on('reconnect', () => {
      changed.value += 1
    })
  }

  function disconnect(): void {
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  onMounted(connect)
  onBeforeUnmount(disconnect)

  return { connected, changed }
}

/**
 * Subscribes to a single ticket room. The server validates the session cookie
 * and object access; this client cannot join rooms by claiming an id.
 * On reconnect the caller must refetch authoritative data instead of relying
 * on missed events.
 */
export function useTicketRealtime(ticketId: () => number | null) {
  const connected = ref(false)
  const reconnectCount = ref(0)
  const changed = ref(0)
  let socket: Socket | null = null

  function connect(): void {
    const id = ticketId()
    if (!id) return
    socket = io(SOCKET_OPTIONS)

    socket.on('connect', () => {
      connected.value = true
      socket?.emit('ticket:subscribe', { ticketId: id }, (response: { ok?: boolean }) => {
        if (!response?.ok) connected.value = false
      })
    })
    socket.on('disconnect', () => {
      connected.value = false
    })
    socket.io.on('reconnect', () => {
      reconnectCount.value += 1
      connected.value = true
      socket?.emit('ticket:subscribe', { ticketId: id })
      // Trigger a refetch so events missed while offline are reconciled.
      changed.value += 1
    })
    socket.on('ticket:changed', () => {
      changed.value += 1
    })
  }

  function disconnect(): void {
    socket?.emit('ticket:unsubscribe', { ticketId: ticketId() })
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  onMounted(connect)
  onBeforeUnmount(disconnect)

  return { connected, changed, reconnectCount }
}
