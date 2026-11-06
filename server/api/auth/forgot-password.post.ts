import { forgotPasswordSchema } from '../../../shared/validation'
import { requestPasswordReset } from '../../services/auth.service'
import { defineApiHandler, enforceRateLimit, readJsonBody } from '../../utils/http'

const GENERIC_MESSAGE =
  'اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز برای آن ارسال می‌شود.'

export default defineApiHandler(async (event, context) => {
  enforceRateLimit(
    event,
    `forgot:ip:${context.ipHash ?? 'unknown'}`,
    5,
    60 * 60 * 1000,
    'تعداد درخواست‌های بازیابی بیش از حد مجاز است.',
  )
  const input = await readJsonBody(event, forgotPasswordSchema)
  await requestPasswordReset(input.email)
  return { data: { message: GENERIC_MESSAGE } }
})
