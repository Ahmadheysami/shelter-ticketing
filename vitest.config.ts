import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const testKey = Buffer.alloc(32, 7).toString('base64')

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '~~': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    globalSetup: ['./tests/setup/global-setup.ts'],
    // One SQLite file and one Prisma client: test files must never overlap.
    pool: 'forks',
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      APP_URL: 'http://localhost:3000',
      DATABASE_URL: 'file:./data/test.db',
      MFA_ENCRYPTION_KEY: testKey,
      IP_HASH_SECRET: testKey,
      ALLOW_SEED: 'true',
    },
  },
})
