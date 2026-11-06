import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../../prisma/generated/client'
import { resolveSqlitePath } from './sqlite-path'

// One Prisma client per process. In development Nuxt reloads handlers often,
// so the instance is stored on globalThis to avoid exhausting SQLite handles.
const globalForPrisma = globalThis as unknown as { __ticketingPrisma?: PrismaClient }

export function useDb(): PrismaClient {
  if (!globalForPrisma.__ticketingPrisma) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is required')

    // Resolve to an absolute path: the driver opens relative URLs from
    // `process.cwd()`, which is `.output` during `nuxt preview`.
    const filePath = resolveSqlitePath(url)
    // `data/` is gitignored, so a fresh clone or a preview could otherwise
    // fail with "directory does not exist" before SQLite creates the file.
    mkdirSync(dirname(filePath), { recursive: true })
    const adapter = new PrismaBetterSqlite3({ url: `file:${filePath}` })
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
