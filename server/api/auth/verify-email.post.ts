import { z } from 'zod'
import { verifyEmailToken } from '../../services/auth.service'
import { defineApiHandler, enforceRateLimit, readJsonBody } from '../../utils/http'

const schema = z.object({ token: z.string().min(20, 'لینک تأیید معتبر نیست').max(200) })

export default defineApiHandler(async (event, context) => {
  enforceRateLimit(event, `verify-email:ip:${context.ipHash ?? 'unknown'}`, 10, 60 * 60 * 1000)
  const input = await readJsonBody(event, schema)
  await verifyEmailToken(input.token)
  return { data: { success: true } }
})
