/**
 * Development-only seed data. Refuses to run in production or without
 * ALLOW_SEED=true, and generates random passwords instead of known defaults.
 */
import 'dotenv/config'
import { createHash, randomBytes } from 'node:crypto'
import { Algorithm, hash } from '@node-rs/argon2'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/client'

if (process.env.NODE_ENV === 'production') {
  console.error('Seed refused: production environment.')
  process.exit(1)
}
if (process.env.ALLOW_SEED !== 'true') {
  console.error('Seed refused: set ALLOW_SEED=true for development seeding.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.')
  process.exit(1)
}

function randomPassword(): string {
  return `Dev-${randomBytes(9).toString('base64url')}1a`
}

function hashStaffSecret(secret: string): string {
  return createHash('sha256').update(`staff-secret:${secret}`, 'utf8').digest('hex')
}

async function main(): Promise<void> {
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) })
  const passwordHashOptions = {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  }

  try {
    const existing = await db.user.count()
    if (existing > 0) {
      console.info('Seed skipped: database already contains users.')
      return
    }

    const adminSecret = `Dev-${randomBytes(24).toString('base64url')}`
    const userPassword = randomPassword()
    const adminHash = await hash(randomPassword(), passwordHashOptions)
    const userHash = await hash(userPassword, passwordHashOptions)
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    const admin = await db.user.create({
      data: {
        name: 'مدیر پشتیبانی',
        email: 'admin@example.com',
        passwordHash: adminHash,
        staffSecretHash: hashStaffSecret(adminSecret),
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        profileCompletedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    })
    const user = await db.user.create({
      data: {
        name: 'کاربر نمونه',
        email: 'user@example.com',
        passwordHash: userHash,
        role: 'USER',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    })

    const samples = [
      { subject: 'عدم امکان ورود پس از تغییر رمز', category: 'ACCOUNT', status: 'OPEN', priority: 'HIGH', daysAgo: 1 },
      { subject: 'خطا در بارگذاری صورتحساب', category: 'BILLING', status: 'IN_PROGRESS', priority: 'NORMAL', daysAgo: 2 },
      { subject: 'درخواست افزودن خروجی Excel', category: 'FEATURE_REQUEST', status: 'WAITING_FOR_USER', priority: 'LOW', daysAgo: 4 },
      { subject: 'قطع مکرر اتصال در ساعات اوج', category: 'TECHNICAL', status: 'RESOLVED', priority: 'URGENT', daysAgo: 6 },
      { subject: 'سوال درباره سیاست نگهداری داده', category: 'OTHER', status: 'CLOSED', priority: 'LOW', daysAgo: 9 },
      { subject: 'نارضایتی از زمان پاسخ‌گویی', category: 'OTHER', status: 'IN_PROGRESS', priority: 'HIGH', daysAgo: 3 },
      { subject: 'مشکل در دریافت ایمیل تأیید', category: 'ACCOUNT', status: 'OPEN', priority: 'NORMAL', daysAgo: 0 },
      { subject: 'درخواست فاکتور رسمی', category: 'BILLING', status: 'RESOLVED', priority: 'NORMAL', daysAgo: 12 },
    ] as const

    for (const [index, sample] of samples.entries()) {
      const createdAt = new Date(now - sample.daysAgo * day - index * 3_600_000)
      const ticket = await db.ticket.create({
        data: {
          subject: sample.subject,
          description:
            'این یک تیکت نمونه برای محیط توسعه است. جزئیات، اقدامات انجام‌شده و پیام خطای احتمالی در این بخش قرار می‌گیرد.',
          category: sample.category,
          status: sample.status,
          priority: sample.priority,
          requesterId: user.id,
          assigneeId: index % 3 === 0 ? null : admin.id,
          createdAt,
          updatedAt: createdAt,
          lastMessageAt: createdAt,
          resolvedAt: sample.status === 'RESOLVED' ? new Date(createdAt.getTime() + 5 * 3_600_000) : null,
          closedAt: sample.status === 'CLOSED' ? new Date(createdAt.getTime() + day) : null,
        },
      })

      await db.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: admin.id,
          body: 'سلام، درخواست شما دریافت شد و در حال بررسی است.',
          visibility: 'PUBLIC',
          createdAt: new Date(createdAt.getTime() + 30 * 60_000),
        },
      })
      if (index % 2 === 0) {
        await db.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            authorId: admin.id,
            body: 'یادداشت داخلی نمونه: بررسی سابقه نشست‌ها و هماهنگی با تیم فنی.',
            visibility: 'INTERNAL',
            createdAt: new Date(createdAt.getTime() + 45 * 60_000),
          },
        })
      }
      await db.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ticket.created',
          entityType: 'Ticket',
          entityId: String(ticket.id),
          metadata: JSON.stringify({ seed: true }),
          createdAt,
        },
      })
    }

    console.info('\nDevelopment seed complete.\n')
    console.info('  Admin secret (login at /admin/login):', adminSecret)
    console.info('  User: user@example.com /', userPassword)
    console.info('\nThese credentials are not stored anywhere. The owner is auto-provisioned from OWNER_SECRET.\n')
  } finally {
    await db.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : 'unknown error')
  process.exit(1)
})
