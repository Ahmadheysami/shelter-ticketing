import {
  isStaff,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../../shared/domain'
import type { Role, TicketCategory, TicketPriority, TicketStatus, UserStatus } from '../../shared/domain'
import type {
  AdminStats,
  AdminUserRow,
  AuditLogRow,
  Paginated,
  SessionInfo,
  TicketStatusCounts,
} from '../../shared/types/api'
import { writeAudit } from '../utils/audit'
import { hashStaffSecret, randomToken } from '../utils/crypto'
import { useDb } from '../utils/db'
import { apiError } from '../utils/errors'
import { hashPassword } from '../utils/password'
import { invalidateUserSockets } from '../utils/realtime'
import type { Actor } from './ticket.service'

interface UserListQuery {
  q?: string
  role?: Role
  status?: UserStatus
  page: number
  pageSize: number
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function getAdminStats(days: number): Promise<AdminStats> {
  const db = useDb()
  const now = new Date()
  const rangeStart = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  rangeStart.setUTCHours(0, 0, 0, 0)
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  const [statusGroups, priorityGroups, categoryGroups, all, unassigned, urgentOpen, createdToday, rangeTickets] =
    await Promise.all([
      db.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      db.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
      db.ticket.groupBy({ by: ['category'], _count: { _all: true } }),
      db.ticket.count(),
      db.ticket.count({
        where: { assigneeId: null, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      db.ticket.count({
        where: { priority: 'URGENT', status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      db.ticket.count({ where: { createdAt: { gte: todayStart } } }),
      db.ticket.findMany({
        where: {
          OR: [{ createdAt: { gte: rangeStart } }, { resolvedAt: { gte: rangeStart } }],
        },
        select: { createdAt: true, resolvedAt: true },
        // Bounded read: the range is capped at 90 days and this many rows.
        take: 25_000,
      }),
    ])

  const totals: TicketStatusCounts & { all: number } = {
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_USER: 0,
    RESOLVED: 0,
    CLOSED: 0,
    all,
  }
  for (const group of statusGroups) {
    if ((TICKET_STATUSES as readonly string[]).includes(group.status)) {
      totals[group.status as TicketStatus] = group._count._all
    }
  }

  const priority = Object.fromEntries(
    TICKET_PRIORITIES.map((value) => [value, 0]),
  ) as Record<TicketPriority, number>
  for (const group of priorityGroups) {
    if ((TICKET_PRIORITIES as readonly string[]).includes(group.priority)) {
      priority[group.priority as TicketPriority] = group._count._all
    }
  }

  const category = Object.fromEntries(
    TICKET_CATEGORIES.map((value) => [value, 0]),
  ) as Record<TicketCategory, number>
  for (const group of categoryGroups) {
    if ((TICKET_CATEGORIES as readonly string[]).includes(group.category)) {
      category[group.category as TicketCategory] = group._count._all
    }
  }

  const trendMap = new Map<string, { created: number; resolved: number }>()
  for (let index = 0; index < days; index += 1) {
    const date = new Date(rangeStart.getTime() + index * 24 * 60 * 60 * 1000)
    trendMap.set(dayKey(date), { created: 0, resolved: 0 })
  }

  let resolutionHoursTotal = 0
  let resolutionCount = 0
  for (const ticket of rangeTickets) {
    const createdKey = dayKey(ticket.createdAt)
    const createdBucket = trendMap.get(createdKey)
    if (createdBucket && ticket.createdAt >= rangeStart) createdBucket.created += 1
    if (ticket.resolvedAt && ticket.resolvedAt >= rangeStart) {
      const resolvedBucket = trendMap.get(dayKey(ticket.resolvedAt))
      if (resolvedBucket) resolvedBucket.resolved += 1
      const hours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 3_600_000
      if (hours >= 0) {
        resolutionHoursTotal += hours
        resolutionCount += 1
      }
    }
  }

  const resolvedTotal = totals.RESOLVED + totals.CLOSED
  return {
    totals,
    priority,
    category,
    unassigned,
    urgentOpen,
    createdToday,
    resolutionRate: all > 0 ? Math.round((resolvedTotal / all) * 1000) / 10 : 0,
    averageResolutionHours:
      resolutionCount > 0 ? Math.round((resolutionHoursTotal / resolutionCount) * 10) / 10 : null,
    trend: [...trendMap.entries()].map(([date, counts]) => ({ date, ...counts })),
    rangeDays: days,
  }
}

export async function listUsers(
  actor: Actor,
  query: UserListQuery,
): Promise<Paginated<AdminUserRow>> {
  if (!['ADMIN', 'OWNER'].includes(actor.role)) {
    apiError(403, 'FORBIDDEN', 'دسترسی به این بخش مجاز نیست.')
  }
  const db = useDb()
  const where: Record<string, unknown> = {}
  if (query.role) where.role = query.role
  if (query.status) where.status = query.status
  if (query.q) {
    where.OR = [{ name: { contains: query.q } }, { email: { contains: query.q } }]
  }
  const [rows, total] = await db.$transaction([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        profileCompletedAt: true,
        lastLoginAt: true,
        createdAt: true,
        mfaCredential: { select: { confirmedAt: true } },
        _count: { select: { requestedTickets: true } },
      },
    }),
    db.user.count({ where }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as Role,
      status: row.status as UserStatus,
      mfaEnabled: Boolean(row.mfaCredential?.confirmedAt),
      // Regular users always have a usable profile; only staff start with a
      // placeholder identity that they complete after their first sign-in.
      profileCompleted: row.role === 'USER' || Boolean(row.profileCompletedAt),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      ticketCount: row._count.requestedTickets,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function updateUserByAdmin(
  actor: Actor,
  targetId: string,
  input: { role?: Role; status?: UserStatus },
  ipHash: string | null,
): Promise<{ staffSecret?: string }> {
  const db = useDb()
  const target = await db.user.findUnique({ where: { id: targetId } })
  if (!target) apiError(404, 'USER_NOT_FOUND', 'کاربر یافت نشد.')

  if (actor.id === targetId) {
    apiError(403, 'CANNOT_MODIFY_SELF', 'نمی‌توانید نقش یا وضعیت حساب خود را تغییر دهید.')
  }
  if (target.role === 'OWNER') {
    apiError(403, 'OWNER_PROTECTED', 'حساب مالک سیستم از این مسیر قابل تغییر نیست.')
  }
  if (actor.role === 'ADMIN') {
    if (target.role !== 'USER') {
      apiError(403, 'FORBIDDEN', 'مدیرها فقط می‌توانند کاربران عادی را مدیریت کنند.')
    }
    if (input.role !== undefined) {
      apiError(403, 'FORBIDDEN', 'تغییر نقش فقط توسط مالک سیستم انجام می‌شود.')
    }
  }
  if (input.role === 'OWNER') {
    apiError(403, 'OWNER_INVARIANT', 'نقش مالک سیستم فقط از طریق فرایند راه‌اندازی اولیه تعیین می‌شود.')
  }
  if (input.role && !['USER', 'ADMIN'].includes(input.role)) {
    apiError(422, 'INVALID_ROLE', 'نقش انتخاب‌شده معتبر نیست.')
  }

  const now = new Date()
  const changingRole = input.role !== undefined && input.role !== target.role
  const suspending = input.status === 'SUSPENDED' && target.status !== 'SUSPENDED'
  // Promoting a normal user grants staff access, which is secret-only. Generate
  // a fresh secret and hand it to the owner once; the user sets name/email later.
  const promotingToAdmin = input.role === 'ADMIN' && target.role !== 'ADMIN'
  const demotingToUser = input.role === 'USER' && target.role === 'ADMIN'
  const staffSecret = promotingToAdmin ? randomToken(32) : undefined

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(staffSecret
          ? {
              staffSecretHash: hashStaffSecret(staffSecret),
              profileCompletedAt: target.profileCompletedAt ?? now,
            }
          : {}),
        // A demoted admin must not keep a usable staff key. They can recover
        // password access through the normal reset flow if needed.
        ...(demotingToUser ? { staffSecretHash: null } : {}),
      },
    })
    if (suspending || changingRole) {
      await tx.session.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: now },
      })
    }
    await writeAudit(tx, {
      actorId: actor.id,
      action: input.role ? 'user.role_changed' : 'user.status_changed',
      entityType: 'User',
      entityId: targetId,
      metadata: {
        fromRole: target.role,
        toRole: input.role,
        fromStatus: target.status,
        toStatus: input.status,
      },
      ipHash,
    })
  })

  if (suspending || changingRole) {
    invalidateUserSockets(targetId)
  }
  return staffSecret ? { staffSecret } : {}
}

/**
 * Creates an ADMIN account with a server-generated secret. The owner never
 * chooses credentials; the new admin signs in with the secret and completes
 * their own name and email on first use.
 */
export async function createStaffUser(
  actor: Actor,
  ipHash: string | null,
): Promise<{ id: string; secret: string }> {
  if (actor.role !== 'OWNER') {
    apiError(403, 'FORBIDDEN', 'ایجاد حساب مدیریتی فقط توسط مالک سیستم مجاز است.')
  }
  const db = useDb()
  const secret = randomToken(32)
  // A random unusable password keeps the non-null column honest; staff login
  // never consults it and normal-login rejects staff accounts.
  const passwordHash = await hashPassword(randomToken(32))
  const placeholderEmail = `staff-${randomToken(8)}@staff.invalid`

  const created = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: '',
        email: placeholderEmail,
        passwordHash,
        staffSecretHash: hashStaffSecret(secret),
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordChangedAt: new Date(),
      },
    })
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: 'ADMIN' },
      ipHash,
    })
    return user
  })
  return { id: created.id, secret }
}

export async function listAuditLogs(query: {
  page: number
  pageSize: number
  action?: string
}): Promise<Paginated<AuditLogRow>> {
  const db = useDb()
  const where = query.action ? { action: query.action } : {}
  const [rows, total] = await db.$transaction([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ])

  return {
    items: rows.map((row) => {
      let metadata: Record<string, unknown> | null = null
      if (row.metadata) {
        try {
          metadata = JSON.parse(row.metadata) as Record<string, unknown>
        } catch {
          metadata = null
        }
      }
      return {
        id: row.id,
        action: row.action,
        actor: row.actor,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata,
        createdAt: row.createdAt.toISOString(),
      }
    }),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function listAllActiveSessions(): Promise<
  Array<SessionInfo & { user: { id: string; name: string; email: string; role: Role } }>
> {
  const db = useDb()
  const sessions = await db.session.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  return sessions.map((session) => ({
    id: session.id,
    current: false,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    mfaSatisfied: session.mfaSatisfied,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role as Role,
    },
  }))
}

export async function ensureStaff(actor: Actor): Promise<void> {
  if (!isStaff(actor.role)) apiError(403, 'FORBIDDEN', 'دسترسی به این بخش مجاز نیست.')
}
