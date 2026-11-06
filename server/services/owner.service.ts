import { writeAudit } from '../utils/audit'
import {
  hashStaffSecret,
  normalizeStaffSecret,
  randomToken,
  STAFF_SECRET_MIN_LENGTH,
} from '../utils/crypto'
import { useDb } from '../utils/db'
import { hashPassword } from '../utils/password'
import { invalidateUserSockets } from '../utils/realtime'

export type OwnerProvisionAction = 'disabled' | 'invalid' | 'unchanged' | 'synced' | 'created'

/**
 * Idempotent OWNER provisioning used at startup.
 *
 * - No secret configured: do nothing.
 * - No OWNER: create exactly one with a placeholder identity.
 * - OWNER exists: keep it, but sync the stored key hash to OWNER_SECRET when it
 *   changed. This makes the env value the source of truth without ever creating
 *   a second owner.
 */
export async function ensureOwnerAccount(
  rawSecret: string | null | undefined,
): Promise<{ action: OwnerProvisionAction }> {
  if (!rawSecret) return { action: 'disabled' }

  const secret = normalizeStaffSecret(rawSecret)
  if (secret.length < STAFF_SECRET_MIN_LENGTH) return { action: 'invalid' }

  const db = useDb()
  const staffSecretHash = hashStaffSecret(secret)
  const owner = await db.user.findFirst({ where: { role: 'OWNER' } })

  if (owner) {
    if (owner.staffSecretHash === staffSecretHash) return { action: 'unchanged' }
    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: owner.id }, data: { staffSecretHash } })
      // Rotating the owner credential must also invalidate every existing
      // owner session and live socket, not just change the login key.
      await tx.session.updateMany({
        where: { userId: owner.id, revokedAt: null },
        data: { revokedAt: now },
      })
      await writeAudit(tx, {
        actorId: owner.id,
        action: 'owner.bootstrap',
        entityType: 'User',
        entityId: owner.id,
        metadata: { source: 'env', mode: owner.staffSecretHash ? 'sync_env' : 'bind_existing' },
      })
    })
    invalidateUserSockets(owner.id)
    return { action: 'synced' }
  }

  const passwordHash = await hashPassword(randomToken(32))
  await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: '',
        email: `owner-${randomToken(8)}@staff.invalid`,
        passwordHash,
        staffSecretHash,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
    await writeAudit(tx, {
      actorId: created.id,
      action: 'owner.bootstrap',
      entityType: 'User',
      entityId: created.id,
      metadata: { source: 'env', mode: 'create' },
    })
  })
  return { action: 'created' }
}
