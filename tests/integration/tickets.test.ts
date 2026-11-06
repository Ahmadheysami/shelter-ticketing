import { beforeEach, describe, expect, it } from 'vitest'
import type { Role } from '../../shared/domain'
import {
  addMessage,
  createTicket,
  getTicket,
  listTickets,
  updateTicketAsRequester,
  updateTicketAsStaff,
} from '../../server/services/ticket.service'
import type { Actor } from '../../server/services/ticket.service'
import { useDb } from '../../server/utils/db'
import { hashPassword } from '../../server/utils/password'
import { resetDatabase } from '../helpers/db'

async function createUser(email: string, role: Role = 'USER') {
  const user = await useDb().user.create({
    data: {
      name: `نام ${role}`,
      email,
      passwordHash: await hashPassword('CorrectHorse123'),
      role,
      status: 'ACTIVE',
      passwordChangedAt: new Date(),
    },
  })
  const actor: Actor = { id: user.id, name: user.name, role }
  return { user, actor }
}

const ticketInput = {
  subject: 'خطا در ورود به حساب',
  description: 'پس از تغییر رمز، پیام خطا می‌گیرم و نمی‌توانم به حساب وارد شوم.',
  category: 'TECHNICAL',
  priority: 'HIGH',
}

const listQuery = {
  page: 1,
  pageSize: 10,
  sort: 'updated' as const,
}

beforeEach(async () => {
  await resetDatabase()
})

describe('object-level authorization (IDOR)', () => {
  it('never returns another user ticket through detail, list, or updates', async () => {
    const alice = await createUser('alice@example.com')
    const bob = await createUser('bob@example.com')

    const created = await createTicket(alice.actor, ticketInput, null)

    await expect(getTicket(bob.actor, created.id)).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
      status: 404,
    })

    const bobList = await listTickets(bob.actor, listQuery)
    expect(bobList.items).toHaveLength(0)

    await expect(
      updateTicketAsRequester(bob.actor, created.id, 'CLOSED', null),
    ).rejects.toMatchObject({ code: 'TICKET_NOT_FOUND' })

    await expect(
      addMessage(bob.actor, created.id, { body: 'پیام غیرمجاز', visibility: 'PUBLIC' }, null),
    ).rejects.toMatchObject({ code: 'TICKET_NOT_FOUND' })

    const aliceDetail = await getTicket(alice.actor, created.id)
    expect(aliceDetail.publicId).toBe(`TK-${String(created.id).padStart(5, '0')}`)
  })

  it('hides internal notes from the requester and blocks requester internal notes', async () => {
    const user = await createUser('user@example.com')
    const admin = await createUser('admin@example.com', 'ADMIN')
    const created = await createTicket(user.actor, ticketInput, null)

    await expect(
      addMessage(user.actor, created.id, { body: 'تلاش یادداشت داخلی', visibility: 'INTERNAL' }, null),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    await addMessage(admin.actor, created.id, { body: 'یادداشت محرمانه تیم', visibility: 'INTERNAL' }, null)
    await addMessage(admin.actor, created.id, { body: 'پاسخ عمومی', visibility: 'PUBLIC' }, null)

    const requesterView = await getTicket(user.actor, created.id)
    expect(requesterView.messages).toHaveLength(1)
    expect(requesterView.messages[0]?.body).toBe('پاسخ عمومی')
    // The total must not disclose the number of hidden internal notes.
    expect(requesterView.messagesTotal).toBe(1)

    const staffView = await getTicket(admin.actor, created.id)
    expect(staffView.messages).toHaveLength(2)
    expect(staffView.messagesTotal).toBe(2)
    expect(staffView.messages.some((message) => message.visibility === 'INTERNAL')).toBe(true)
  })
})

describe('ticket workflow', () => {
  it('validates staff transitions, assignment targets, and closed tickets', async () => {
    const user = await createUser('user@example.com')
    const admin = await createUser('admin@example.com', 'ADMIN')
    const created = await createTicket(user.actor, ticketInput, null)

    await expect(updateTicketAsStaff(user.actor, created.id, { status: 'RESOLVED' }, null)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })

    await expect(
      updateTicketAsStaff(admin.actor, created.id, { assigneeId: user.user.id }, null),
    ).rejects.toMatchObject({ code: 'INVALID_ASSIGNEE' })

    await updateTicketAsStaff(admin.actor, created.id, { assigneeId: admin.actor.id }, null)
    const assigned = await getTicket(admin.actor, created.id)
    expect(assigned.assignee?.id).toBe(admin.actor.id)

    await updateTicketAsStaff(admin.actor, created.id, { status: 'RESOLVED' }, null)
    await updateTicketAsStaff(admin.actor, created.id, { status: 'CLOSED' }, null)

    await expect(
      addMessage(user.actor, created.id, { body: 'پیام بعد از بستن', visibility: 'PUBLIC' }, null),
    ).rejects.toMatchObject({ code: 'TICKET_CLOSED' })

    await expect(
      updateTicketAsStaff(admin.actor, created.id, { status: 'IN_PROGRESS' }, null),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('lets the requester close and reopen within the documented window', async () => {
    const user = await createUser('user@example.com')
    const created = await createTicket(user.actor, ticketInput, null)

    await updateTicketAsRequester(user.actor, created.id, 'CLOSED', null)
    const closed = await getTicket(user.actor, created.id)
    expect(closed.status).toBe('CLOSED')
    expect(closed.can.reopen).toBe(true)

    await updateTicketAsRequester(user.actor, created.id, 'OPEN', null)
    const reopened = await getTicket(user.actor, created.id)
    expect(reopened.status).toBe('OPEN')
    expect(reopened.closedAt).toBeNull()

    await expect(
      updateTicketAsStaff(user.actor, created.id, { status: 'RESOLVED' }, null),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('moves a waiting ticket back to in-progress when the requester replies', async () => {
    const user = await createUser('user@example.com')
    const admin = await createUser('admin@example.com', 'ADMIN')
    const created = await createTicket(user.actor, ticketInput, null)
    await updateTicketAsStaff(admin.actor, created.id, { status: 'WAITING_FOR_USER' }, null)

    await addMessage(user.actor, created.id, { body: 'اطلاعات تکمیلی ارسال شد.', visibility: 'PUBLIC' }, null)
    const detail = await getTicket(user.actor, created.id)
    expect(detail.status).toBe('IN_PROGRESS')
  })
})

describe('audit trail', () => {
  it('records ticket creation, status changes, assignment, and internal notes', async () => {
    const user = await createUser('user@example.com')
    const admin = await createUser('admin@example.com', 'ADMIN')
    const created = await createTicket(user.actor, ticketInput, null)
    await updateTicketAsStaff(admin.actor, created.id, { status: 'IN_PROGRESS', assigneeId: admin.actor.id }, null)
    await addMessage(admin.actor, created.id, { body: 'یادداشت داخلی', visibility: 'INTERNAL' }, null)

    const actions = (await useDb().auditLog.findMany({ select: { action: true } })).map((row) => row.action)
    expect(actions).toContain('ticket.created')
    expect(actions).toContain('ticket.updated')
    expect(actions).toContain('ticket.message_internal')
  })

  it('does not leak sensitive metadata into audit rows', async () => {
    const user = await createUser('user@example.com')
    await createTicket(user.actor, ticketInput, null)
    const rows = await useDb().auditLog.findMany()
    const serialized = JSON.stringify(rows)
    expect(serialized).not.toContain('passwordHash')
    expect(serialized).not.toContain('CorrectHorse123')
  })
})
