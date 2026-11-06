import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../../prisma/generated/client'

// One Prisma client per process. In development Nuxt reloads handlers often,
// so the instance is stored on globalThis to avoid exhausting SQLite handles.
const globalForPrisma = globalThis as unknown as { __ticketingPrisma?: PrismaClient }

export function useDb(): PrismaClient {
  if (!globalForPrisma.__ticketingPrisma) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is required')
    const adapter = new PrismaBetterSqlite3({ url })
    globalForPrisma.__ticketingPrisma = new PrismaClient({ adapter })
  }
  return globalForPrisma.__ticketingPrisma
}

/** Test helper: closes and forgets the client so a new DATABASE_URL is used. */
export async function resetDbForTests(): Promise<void> {
  if (globalForPrisma.__ticketingPrisma) {
    await globalForPrisma.__ticketingPrisma.$disconnect()
    globalForPrisma.__ticketingPrisma = undefined
  }
}
