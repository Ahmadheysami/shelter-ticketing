import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'
import type { Role, UserStatus } from '../../shared/domain'
import { useDb } from './db'
import {
  SESSION_COOKIE,
  SESSION_TOUCH_INTERVAL_MS,
  hashSessionToken,
  sessionCookieOptions,
  SESSION_TTL_MS,
} from './session-cookie'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  emailVerifiedAt: Date | null
  createdAt: Date
  mfaEnabled: boolean
  /** Staff must set their own name/email after the first secret login. */
  profileCompleted: boolean
}

export interface AuthSession {
  id: string
  mfaSatisfied: boolean
  reauthenticatedAt: Date | null
  createdAt: Date
  expiresAt: Date
}

export interface AuthContext {
  user: AuthUser
  session: AuthSession
}

interface LoadedSession {
  context: AuthContext
  userId: string
}

/**
 * Resolves a session token against the database. Used by HTTP requests and by
 * Socket.IO handshakes so both transports share one source of truth.
 */
export async function loadSessionByToken(token: string): Promise<LoadedSession | null> {
  const db = useDb()
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: { include: { mfaCredential: true } },
    },
  })
  if (!session) return null

  const now = new Date()
  if (session.revokedAt || session.expiresAt <= now) return null
  if (session.user.status !== 'ACTIVE') {
    await db.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now },
    })
    return null
  }

  // Sliding last-seen timestamp, throttled to avoid a write on every request.
  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: now } })
  }

  const mfaEnabled = Boolean(session.user.mfaCredential?.confirmedAt)
  return {
    userId: session.userId,
    context: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as Role,
        status: session.user.status as UserStatus,
        emailVerifiedAt: session.user.emailVerifiedAt,
        createdAt: session.user.createdAt,
        mfaEnabled,
        profileCompleted: Boolean(session.user.profileCompletedAt),
      },
      session: {
        id: session.id,
        mfaSatisfied: session.mfaSatisfied,
        reauthenticatedAt: session.reauthenticatedAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    },
  }
}

/** Session resolution memoized per request. */
export async function resolveAuth(event: H3Event): Promise<AuthContext | null> {
  const cached = (event.context as { __authState?: { value: AuthContext | null } }).__authState
  if (cached) return cached.value

  const token = getCookie(event, SESSION_COOKIE)
  let value: AuthContext | null = null
  if (token) {
    const loaded = await loadSessionByToken(token)
    value = loaded?.context ?? null
    if (!loaded) deleteCookie(event, SESSION_COOKIE, { path: '/' })
  }
  ;(event.context as { __authState?: { value: AuthContext | null } }).__authState = { value }
  return value
}

export function setSessionCookie(event: H3Event, token: string, maxAgeMs: number = SESSION_TTL_MS) {
  setCookie(event, SESSION_COOKIE, token, sessionCookieOptions(maxAgeMs))
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
