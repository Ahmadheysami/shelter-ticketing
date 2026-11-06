import { beforeEach, describe, expect, it } from 'vitest'
import { ensureOwnerAccount } from '../../server/services/owner.service'
import { hashStaffSecret, sha256 } from '../../server/utils/crypto'
import { useDb } from '../../server/utils/db'
import { resetDatabase } from '../helpers/db'

const SECRET = `owner-${'a'.repeat(40)}`
const NEXT_SECRET = `owner-${'b'.repeat(40)}`

beforeEach(async () => {
  await resetDatabase()
})

describe('owner provisioning', () => {
  it('creates exactly one owner when none exists and does not duplicate it on later runs', async () => {
    expect((await ensureOwnerAccount(SECRET)).action).toBe('created')
    expect((await ensureOwnerAccount(SECRET)).action).toBe('unchanged')

    const owners = await useDb().user.findMany({ where: { role: 'OWNER' } })
    expect(owners).toHaveLength(1)
    expect(owners[0]?.staffSecretHash).toBe(hashStaffSecret(SECRET))
    expect(owners[0]?.profileCompletedAt).toBeNull()
  })

  it('syncs a changed OWNER_SECRET to the existing owner instead of creating another', async () => {
    await ensureOwnerAccount(SECRET)
    expect((await ensureOwnerAccount(NEXT_SECRET)).action).toBe('synced')

    const owners = await useDb().user.findMany({ where: { role: 'OWNER' } })
    expect(owners).toHaveLength(1)
    expect(owners[0]?.staffSecretHash).toBe(hashStaffSecret(NEXT_SECRET))
  })

  it('revokes existing owner sessions when the owner secret rotates', async () => {
    await ensureOwnerAccount(SECRET)
    const owner = await useDb().user.findFirst({ where: { role: 'OWNER' } })
    expect(owner).not.toBeNull()
    const session = await useDb().session.create({
      data: {
        tokenHash: sha256('owner-rotation-session'),
        userId: owner!.id,
        mfaSatisfied: true,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    expect((await ensureOwnerAccount(NEXT_SECRET)).action).toBe('synced')

    const updated = await useDb().session.findUnique({ where: { id: session.id } })
    expect(updated?.revokedAt).not.toBeNull()
  })

  it('accepts a pasted env line or quoted value as the owner secret', async () => {
    expect((await ensureOwnerAccount(`OWNER_SECRET="${SECRET}"`)).action).toBe('created')
    const owner = await useDb().user.findFirst({ where: { role: 'OWNER' } })
    expect(owner?.staffSecretHash).toBe(hashStaffSecret(SECRET))
  })

  it('does nothing when disabled and refuses a too-short secret', async () => {
    expect((await ensureOwnerAccount(null)).action).toBe('disabled')
    expect((await ensureOwnerAccount('short')).action).toBe('invalid')
    expect(await useDb().user.count({ where: { role: 'OWNER' } })).toBe(0)
  })
})
