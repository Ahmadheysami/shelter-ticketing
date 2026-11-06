/**
 * One-time OWNER bootstrap (optional; the server also does this at startup).
 *
 * Usage:
 *   npm run bootstrap:owner
 *
 * Reads OWNER_SECRET from the environment. The owner signs in at /admin/login
 * with that secret and completes name/email in the UI. Optional --name and
 * --email pre-fill the profile. There is no password and no public route that
 * exposes the secret.
 */
import 'dotenv/config'
import { hash } from '@node-rs/argon2'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../prisma/generated/client'
import {
  hashStaffSecret,
  normalizeStaffSecret,
  randomToken,
  STAFF_SECRET_MIN_LENGTH,
} from '../server/utils/crypto'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

async function main(): Promise<void> {
  const secret = normalizeStaffSecret(process.env.OWNER_SECRET ?? '')
  if (!secret || secret.length < STAFF_SECRET_MIN_LENGTH) {
    fail(`OWNER_SECRET must be set to a random value of at least ${STAFF_SECRET_MIN_LENGTH} characters.`)
  }
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set.')

  const name = (argument('name') ?? '').trim()
  const email = (argument('email') ?? '').trim().toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    fail('--email must be a valid address.')
  }

  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
  const db = new PrismaClient({ adapter })

  try {
    const existingOwner = await db.user.findFirst({ where: { role: 'OWNER' } })
    if (existingOwner) {
      fail('An OWNER account already exists. Provisioning is one-time.')
    }
    if (email && (await db.user.findUnique({ where: { email } }))) {
      fail('This email is already registered.')
    }

    const passwordHash = await hash(randomToken(32), {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })

    await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email: email || `owner-${randomToken(8)}@staff.invalid`,
          passwordHash,
          staffSecretHash: hashStaffSecret(secret),
          role: 'OWNER',
          status: 'ACTIVE',
          profileCompletedAt: name && email ? new Date() : null,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: 'owner.bootstrap',
          entityType: 'User',
          entityId: created.id,
          metadata: JSON.stringify({ source: 'cli' }),
        },
      })
    })

    console.info('\n✔ Owner account provisioned.')
    console.info('  1. Open /admin/login and enter OWNER_SECRET.')
    console.info('  2. Set your name and email on the profile screen.')
    console.info('  3. History: every session expires after one hour. Remove OWNER_SECRET from env if you no longer want startup provisioning.\n')
  } finally {
    await db.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Bootstrap failed:', error instanceof Error ? error.message : 'unknown error')
  process.exit(1)
})
