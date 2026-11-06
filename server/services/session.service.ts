import type { Role } from '../../shared/domain'
import type { SessionInfo } from '../../shared/types/api'
import { writeAudit } from '../utils/audit'
import { useDb } from '../utils/db'
import { apiError } from '../utils/errors'
import { invalidateUserSockets } from '../utils/realtime'

export async function listUserSessions(
  userId: string,
  currentSessionId: string,
): Promise<SessionInfo[]> {
  const db = useDb()
  const sessions = await db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    take: 50,
  })
  return sessions.map((session) => ({
    id: session.id,
    current: session.id === currentSessionId,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    mfaSatisfied: session.mfaSatisfied,
  }))
}

export async function revokeSession(input: {
  actorId: string
  actorRole: Role
  sessionId: string
  currentSessionId: string
  ipHash: string | null
}): Promise<{ targetUserId: string }> {
  const db = useDb()
  const session = await db.session.findUnique({ where: { id: input.sessionId } })
  if (!session || session.revokedAt) {
    apiError(404, 'SESSION_NOT_FOUND', 'نشست یافت نشد.')
  }
  const isOwner = input.actorRole === 'OWNER'
  if (!isOwner && session.userId !== input.actorId) {
    // Do not reveal that another user's session exists.
    apiError(404, 'SESSION_NOT_FOUND', 'نشست یافت نشد.')
  }

  await db.$transaction(async (tx) => {
    await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    await writeAudit(tx, {
      actorId: input.actorId,
      action: 'session.revoked',
      entityType: 'Session',
      entityId: session.id,
      metadata: { targetUserId: session.userId, self: session.userId === input.actorId },
      ipHash: input.ipHash,
    })
  })

  if (session.id !== input.currentSessionId) {
    invalidateUserSockets(session.userId)
  }
  return { targetUserId: session.userId }
}

/** Revokes every session for a user; used after suspension/role changes. */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await useDb().session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  invalidateUserSockets(userId)
}
