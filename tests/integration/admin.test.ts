import { beforeEach, describe, expect, it } from 'vitest'
import type { Role } from '../../shared/domain'
import {
  createStaffUser,
  getAdminStats,
  listUsers,
  updateUserByAdmin,
} from '../../server/services/admin.service'
import type { Actor } from '../../server/services/ticket.service'
import { createTicket } from '../../server/services/ticket.service'
import { loginUser } from '../../server/services/auth.service'
import { loadSessionByToken } from '../../server/utils/auth'
import { useDb } from '../../server/utils/db'
import { hashPassword } from '../../server/utils/password'
import { resetDatabase } from '../helpers/db'

async function createUser(email: string, role: Role = 'USER') {
  const user = await useDb().user.create({
    data: {
      name: `کاربر ${role}`,
      email,
      passwordHash: await hashPassword('CorrectHorse123'),
      role,
      status: 'ACTIVE',
      passwordChangedAt: new Date(),
    },
  })
  return { user, actor: { id: user.id, name: user.name, role } satisfies Actor }
}

beforeEach(async () => {
  await resetDatabase()
})

describe('role escalation protections', () => {
  it('prevents admins from changing roles or managing other staff', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN')
    const user = await createUser('user@example.com', 'USER')
    const otherAdmin = await createUser('other@example.com', 'ADMIN')

    await expect(
      updateUserByAdmin(admin.actor, user.user.id, { role: 'ADMIN' }, null),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    await expect(
      updateUserByAdmin(admin.actor, otherAdmin.user.id, { status: 'SUSPENDED' }, null),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('never allows the OWNER role to be granted through the API', async () => {
    const owner = await createUser('owner@example.com', 'OWNER')
    const user = await createUser('user@example.com', 'USER')

    await expect(
      updateUserByAdmin(owner.actor, user.user.id, { role: 'OWNER' }, null),
    ).rejects.toMatchObject({ code: 'OWNER_INVARIANT' })

    await expect(createStaffUser(user.actor, null)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('creates admins with a server-generated secret and no chosen credentials', async () => {
    const owner = await createUser('owner@example.com', 'OWNER')
    const created = await createStaffUser(owner.actor, null)
    expect(created.secret.length).toBeGreaterThanOrEqual(32)

    const row = await useDb().user.findUnique({ where: { id: created.id } })
    expect(row?.role).toBe('ADMIN')
    expect(row?.staffSecretHash).not.toBeNull()
    expect(row?.profileCompletedAt).toBeNull()
    expect(row?.name).toBe('')
  })

  it('protects the owner account and self-modification', async () => {
    const owner = await createUser('owner@example.com', 'OWNER')
    const admin = await createUser('admin@example.com', 'ADMIN')

    await expect(
      updateUserByAdmin(owner.actor, owner.user.id, { status: 'SUSPENDED' }, null),
    ).rejects.toMatchObject({ code: 'CANNOT_MODIFY_SELF' })

    await expect(
      updateUserByAdmin(admin.actor, owner.user.id, { status: 'SUSPENDED' }, null),
    ).rejects.toMatchObject({ code: 'OWNER_PROTECTED' })
  })

  it('promotes a user to admin and revokes their sessions', async () => {
    const owner = await createUser('owner@example.com', 'OWNER')
    const user = await createUser('user@example.com', 'USER')
    await useDb().user.update({
      where: { id: user.user.id },
      data: { passwordHash: await hashPassword('CorrectHorse123') },
    })
    const session = await loginUser({
      email: 'user@example.com',
      password: 'CorrectHorse123',
      ipHash: null,
      userAgent: null,
    })

    const result = await updateUserByAdmin(owner.actor, user.user.id, { role: 'ADMIN' }, null)

    const updated = await useDb().user.findUnique({ where: { id: user.user.id } })
    expect(updated?.role).toBe('ADMIN')
    expect(updated?.staffSecretHash).not.toBeNull()
    expect(result.staffSecret?.length).toBeGreaterThanOrEqual(32)
    expect(await loadSessionByToken(session.token)).toBeNull()

    const audit = await useDb().auditLog.findFirst({ where: { action: 'user.role_changed' } })
    expect(audit?.actorId).toBe(owner.user.id)
  })

  it('revokes sessions when an admin suspends a user', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN')
    const user = await createUser('user@example.com', 'USER')
    const session = await loginUser({
      email: 'user@example.com',
      password: 'CorrectHorse123',
      ipHash: null,
      userAgent: null,
    })

    await updateUserByAdmin(admin.actor, user.user.id, { status: 'SUSPENDED' }, null)

    expect((await useDb().user.findUnique({ where: { id: user.user.id } }))?.status).toBe(
      'SUSPENDED',
    )
    expect(await loadSessionByToken(session.token)).toBeNull()
  })
})

describe('admin reporting and listing', () => {
  it('returns real aggregated ticket statistics within the requested range', async () => {
    const owner = await createUser('owner@example.com', 'OWNER')
    const user = await createUser('user@example.com', 'USER')
    const admin = await createUser('admin@example.com', 'ADMIN')

    await createTicket(
      user.actor,
      {
        subject: 'مشکل فنی نمونه',
        description: 'شرح کامل مشکل فنی برای آزمون آمار مدیریتی.',
        category: 'TECHNICAL',
        priority: 'URGENT',
      },
      null,
    )
    await createTicket(
      user.actor,
      {
        subject: 'سوال صورتحساب',
        description: 'شرح کامل سوال صورتحساب برای آزمون آمار مدیریتی.',
        category: 'BILLING',
        priority: 'NORMAL',
      },
      null,
    )

    const stats = await getAdminStats(30)
    expect(stats.totals.all).toBeGreaterThanOrEqual(2)
    expect(stats.priority.URGENT).toBe(1)
    expect(stats.category.TECHNICAL).toBe(1)
    expect(stats.unassigned).toBe(2)
    expect(stats.trend).toHaveLength(30)
    expect(stats.resolutionRate).toBeGreaterThanOrEqual(0)

    const listed = await listUsers(owner.actor, { page: 1, pageSize: 10 })
    expect(listed.total).toBe(3)
    expect(listed.items.some((row) => row.id === admin.user.id)).toBe(true)
  })

  it('prevents non-admin actors from listing users', async () => {
    const user = await createUser('user@example.com')
    await expect(listUsers(user.actor, { page: 1, pageSize: 10 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})
