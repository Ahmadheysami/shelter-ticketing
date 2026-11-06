import { useDb } from '../utils/db'
import { defineApiHandler } from '../utils/http'

export default defineApiHandler(async () => {
  await useDb().$queryRaw`SELECT 1`
  return { data: { status: 'ok' } }
})
