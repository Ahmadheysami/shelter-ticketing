import { registerSchema } from '../../../shared/validation'
import { registerUser } from '../../services/auth.service'
import { defineApiHandler, enforceRateLimit, readJsonBody } from '../../utils/http'

export default defineApiHandler(async (event, context) => {
  enforceRateLimit(
    event,
    `register:ip:${context.ipHash ?? 'unknown'}`,
    5,
    60 * 60 * 1000,
    'تعداد تلاش‌های ثبت‌نام بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
  )
  const input = await readJsonBody(event, registerSchema)
  const outcome = await registerUser({
    name: input.name,
    email: input.email,
    password: input.password,
    ipHash: context.ipHash,
  })
  return { data: { message: outcome.message } }
})
