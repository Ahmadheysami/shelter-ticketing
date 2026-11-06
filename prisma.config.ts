import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` also loads this file, so it must not fail before a
    // local `.env` exists. Commands that need a connection receive
    // DATABASE_URL from the environment when it is configured.
    url: process.env.DATABASE_URL || 'file:./data/app.db',
  },
})
