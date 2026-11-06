import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

/**
 * Creates a fresh SQLite database for the test run by applying the committed
 * migrations (never db push), so tests exercise the real schema.
 */
export default function setup(): void {
  mkdirSync('data', { recursive: true })
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`data/test.db${suffix}`, { force: true })
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./data/test.db' },
  })
}
