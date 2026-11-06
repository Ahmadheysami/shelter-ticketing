import {
  canRequesterTransition,
  canStaffTransition,
  CATEGORY_LABELS,
  isStaff,
  ticketReference,
} from '../../shared/domain'
import type { Role, TicketStatus } from '../../shared/domain'
import type {
  Paginated,
  TicketDetail,
  TicketMessageDto,
  TicketSummary,
  UserDashboardStats,
} from '../../shared/types/api'
import type { TicketListQuery } from '../../shared/validation'
import { writeAudit } from '../utils/audit'
import { useDb } from '../utils/db'
import { apiError } from '../utils/errors'
import { emitTicketEvent } from '../utils/realtime'

export interface Actor {
  id: string
  name: string
  role: Role
}

const MAX_TIMELINE_MESSAGES = 200

interface TicketSummaryRecord {
  id: number
  subject: string
  category: string
  status: string
  priority: string
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  requester: { id: string; name: string }
  assignee: { id: string; name: string } | null
}

export function toTicketSummary(ticket: TicketSummaryRecord): TicketSummary {
  return {
    id: ticket.id,
    publicId: ticketReference(ticket.id),
    subject: ticket.subject,
    category: ticket.category as TicketSummary['category'],
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketSummary['priority'],
    requester: ticket.requester,
    assignee: ticket.assignee,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
  }
}

function summarySelect() {
  return {
    id: true,
    subject: true,
    category: true,
    status: true,
    priority: true,
    createdAt: true,
    updatedAt: true,
    lastMessageAt: true,
    requester: { select: { id: true, name: true } },
    assignee: { select: { id: true, name: true } },
  } as const
}

export async function listTickets(
  actor: Actor,
  query: TicketListQuery,
): Promise<Paginated<TicketSummary>> {
  const db = useDb()
  const staff = isStaff(actor.role)
  const where: Record<string, unknown> = {}

  if (!staff || query.scope === 'mine') {
    where.requesterId = actor.id
  } else if (query.scope === 'unassigned') {
    where.assigneeId = null
    where.status = { notIn: ['CLOSED', 'RESOLVED'] }
  }

  if (query.status) where.status = query.status
  if (query.priority) where.priority = query.priority
  if (query.category) where.category = query.category
  if (query.assigneeId) where.assigneeId = query.assigneeId
  if (query.q) {
    where.OR = [
      { subject: { contains: query.q } },
      { description: { contains: query.q } },
      { id: Number.isInteger(Number(query.q)) ? Number(query.q) : -1 },
    ]
  }

  const orderBy =
    query.sort === 'created'
      ? { createdAt: 'desc' as const }
      : { updatedAt: 'desc' as const }

  const skip = (query.page - 1) * query.pageSize
  const [items, total] = await db.$transaction([
    db.ticket.findMany({ where, orderBy, skip, take: query.pageSize, select: summarySelect() }),
    db.ticket.count({ where }),
  ])

  return {
    items: items.map(toTicketSummary),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getTicket(actor: Actor, ticketId: number): Promise<TicketDetail> {
  const db = useDb()
  const staff = isStaff(actor.role)
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      messages: {
        where: staff ? {} : { visibility: 'PUBLIC' },
        orderBy: { createdAt: 'desc' },
        take: MAX_TIMELINE_MESSAGES,
        include: { author: { select: { id: true, name: true, role: true } } },
      },
      _count: { select: { messages: true } },
    },
  })

  // Unauthorized access is indistinguishable from a missing ticket.
  if (!ticket || (!staff && ticket.requesterId !== actor.id)) {
    apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')
  }

  // Counting every message would reveal how many staff-only internal notes
  // exist on the ticket even though their bodies are filtered out.
  const messagesTotal = staff
    ? ticket._count.messages
    : await db.ticketMessage.count({
        where: { ticketId, visibility: 'PUBLIC' },
      })

  const messages: TicketMessageDto[] = ticket.messages
    .slice()
    .reverse()
    .map((message) => ({
      id: message.id,
      body: message.body,
      visibility: message.visibility as TicketMessageDto['visibility'],
      author: {
        id: message.author.id,
        name: message.author.name,
        role: message.author.role as Role,
      },
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    }))

  const isRequester = ticket.requesterId === actor.id
  const status = ticket.status as TicketStatus
  const now = new Date()

  return {
    id: ticket.id,
    publicId: ticketReference(ticket.id),
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category as TicketDetail['category'],
    status,
    priority: ticket.priority as TicketDetail['priority'],
    requester: ticket.requester,
    assignee: ticket.assignee,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    messages,
    messagesTotal,
    can: {
      reply: status !== 'CLOSED' && (staff || isRequester),
      internalNote: staff && status !== 'CLOSED',
      manage: staff,
      close: isRequester && !staff && status !== 'CLOSED',
      reopen: isRequester && !staff && canRequesterTransition(status, 'OPEN', ticket.closedAt, ticket.resolvedAt, now),
      assign: staff,
    },
  }
}

export async function createTicket(
  actor: Actor,
  input: { subject: string; description: string; category: string; priority: string },
  ipHash: string | null,
): Promise<{ id: number; publicId: string }> {
  const db = useDb()
  const ticket = await db.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        subject: input.subject,
        description: input.description,
        category: input.category,
        priority: input.priority,
        requesterId: actor.id,
        status: 'OPEN',
      },
    })
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'ticket.created',
      entityType: 'Ticket',
      entityId: created.id,
      metadata: { category: input.category, priority: input.priority },
      ipHash,
    })
    return created
  })

  emitTicketEvent({ type: 'created', ticketId: ticket.id, requesterId: actor.id })
  return { id: ticket.id, publicId: ticketReference(ticket.id) }
}

/** Staff-only mutation: status, priority, and assignee. */
export async function updateTicketAsStaff(
  actor: Actor,
  ticketId: number,
  input: { status?: TicketStatus; priority?: string; assigneeId?: string | null },
  ipHash: string | null,
): Promise<TicketStatus> {
  if (!isStaff(actor.role)) apiError(403, 'FORBIDDEN', 'شما مجوز انجام این عملیات را ندارید.')
  const db = useDb()
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')

  const currentStatus = ticket.status as TicketStatus
  const now = new Date()
  const data: Record<string, unknown> = {}

  if (input.status && input.status !== currentStatus) {
    if (!canStaffTransition(currentStatus, input.status)) {
      apiError(
        409,
        'INVALID_TRANSITION',
        `تغییر وضعیت از «${currentStatus}» به «${input.status}» مجاز نیست.`,
      )
    }
    data.status = input.status
    if (input.status === 'RESOLVED') {
      data.resolvedAt = now
      data.closedAt = null
    } else if (input.status === 'CLOSED') {
      data.closedAt = now
    } else if (input.status === 'OPEN') {
      data.resolvedAt = null
      data.closedAt = null
    } else {
      data.closedAt = null
    }
  }

  if (input.priority && input.priority !== ticket.priority) {
    data.priority = input.priority
  }

  if (input.assigneeId !== undefined && input.assigneeId !== ticket.assigneeId) {
    if (input.assigneeId) {
      const assignee = await db.user.findUnique({ where: { id: input.assigneeId } })
      if (!assignee || !isStaff(assignee.role as Role) || assignee.status !== 'ACTIVE') {
        apiError(422, 'INVALID_ASSIGNEE', 'مدیر انتخاب‌شده معتبر یا فعال نیست.')
      }
    }
    data.assigneeId = input.assigneeId ?? null
  }

  if (Object.keys(data).length === 0) {
    return currentStatus
  }

  await db.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticketId }, data })
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'ticket.updated',
      entityType: 'Ticket',
      entityId: ticketId,
      metadata: {
        status: data.status as string | undefined,
        priority: data.priority as string | undefined,
        assigned: input.assigneeId !== undefined ? Boolean(input.assigneeId) : undefined,
      },
      ipHash,
    })
  })

  const nextStatus = (data.status as TicketStatus | undefined) ?? currentStatus
  emitTicketEvent({
    type: 'updated',
    ticketId,
    requesterId: ticket.requesterId,
    assigneeId: (data.assigneeId as string | null | undefined) ?? ticket.assigneeId,
  })
  return nextStatus
}

/** Requester may cancel an open ticket or reopen within the documented window. */
export async function updateTicketAsRequester(
  actor: Actor,
  ticketId: number,
  target: 'OPEN' | 'CLOSED',
  ipHash: string | null,
): Promise<TicketStatus> {
  const db = useDb()
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket || ticket.requesterId !== actor.id) {
    apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')
  }
  const currentStatus = ticket.status as TicketStatus
  if (currentStatus === target) return currentStatus
  if (!canRequesterTransition(currentStatus, target, ticket.closedAt, ticket.resolvedAt)) {
    apiError(409, 'INVALID_TRANSITION', 'این تغییر وضعیت برای شما مجاز نیست.')
  }
  const now = new Date()
  const data =
    target === 'CLOSED'
      ? { status: 'CLOSED', closedAt: now }
      : { status: 'OPEN', closedAt: null, resolvedAt: null }

  await db.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: ticketId }, data })
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'ticket.status_changed',
      entityType: 'Ticket',
      entityId: ticketId,
      metadata: { from: currentStatus, to: target, by: 'requester' },
      ipHash,
    })
  })

  emitTicketEvent({ type: 'updated', ticketId, requesterId: ticket.requesterId })
  return target
}

export async function addMessage(
  actor: Actor,
  ticketId: number,
  input: { body: string; visibility: 'PUBLIC' | 'INTERNAL' },
  ipHash: string | null,
): Promise<TicketMessageDto> {
  const db = useDb()
  const staff = isStaff(actor.role)
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket || (!staff && ticket.requesterId !== actor.id)) {
    apiError(404, 'TICKET_NOT_FOUND', 'تیکت یافت نشد.')
  }
  if (ticket.status === 'CLOSED') {
    apiError(409, 'TICKET_CLOSED', 'این تیکت بسته شده است. برای ادامه، درخواست را بازگشایی کنید.')
  }
  if (input.visibility === 'INTERNAL' && !staff) {
    apiError(403, 'FORBIDDEN', 'ایجاد یادداشت داخلی برای کاربران مجاز نیست.')
  }

  const message = await db.$transaction(async (tx) => {
    const created = await tx.ticketMessage.create({
      data: {
        ticketId,
        authorId: actor.id,
        body: input.body,
        visibility: input.visibility,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    })

    let nextStatus: TicketStatus | null = null
    if (!staff && ticket.status === 'WAITING_FOR_USER') nextStatus = 'IN_PROGRESS'
    if (staff && input.visibility === 'PUBLIC' && ticket.status === 'OPEN') nextStatus = 'IN_PROGRESS'

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        lastMessageAt: created.createdAt,
        ...(nextStatus ? { status: nextStatus } : {}),
      },
    })

    await writeAudit(tx, {
      actorId: actor.id,
      action: input.visibility === 'INTERNAL' ? 'ticket.message_internal' : 'ticket.message_public',
      entityType: 'Ticket',
      entityId: ticketId,
      metadata: { messageId: created.id, statusChangedTo: nextStatus ?? undefined },
      ipHash,
    })

    return created
  })

  emitTicketEvent({
    type: 'message',
    ticketId,
    requesterId: ticket.requesterId,
    assigneeId: ticket.assigneeId,
  })

  return {
    id: message.id,
    body: message.body,
    visibility: message.visibility as TicketMessageDto['visibility'],
    author: {
      id: message.author.id,
      name: message.author.name,
      role: message.author.role as Role,
    },
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
  }
}

export async function getUserDashboardStats(actor: Actor): Promise<UserDashboardStats> {
  const db = useDb()
  const [total, open, waiting, resolved, urgent] = await db.$transaction([
    db.ticket.count({ where: { requesterId: actor.id } }),
    db.ticket.count({ where: { requesterId: actor.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    db.ticket.count({ where: { requesterId: actor.id, status: 'WAITING_FOR_USER' } }),
    db.ticket.count({ where: { requesterId: actor.id, status: 'RESOLVED' } }),
    db.ticket.count({
      where: {
        requesterId: actor.id,
        priority: 'URGENT',
        status: { notIn: ['CLOSED', 'RESOLVED'] },
      },
    }),
  ])
  return { total, open, waiting, resolved, urgent }
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category
}

/** Used by Socket.IO to authorize room joins. */
export async function canAccessTicket(actor: Actor, ticketId: number): Promise<boolean> {
  if (!Number.isInteger(ticketId) || ticketId <= 0) return false
  if (isStaff(actor.role)) return true
  const ticket = await useDb().ticket.findUnique({
    where: { id: ticketId },
    select: { requesterId: true },
  })
  return ticket?.requesterId === actor.id
}
