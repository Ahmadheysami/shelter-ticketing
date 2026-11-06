import { z } from 'zod'
import { ROLES, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, USER_STATUSES } from '../domain'

// Zod schemas shared by Nitro handlers and Vue forms. The client runs them for
// UX only; the server always re-parses the same schema.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export const emailField = z
  .string({ error: 'ایمیل الزامی است' })
  .trim()
  .min(1, 'ایمیل الزامی است')
  .max(254, 'ایمیل بیش از حد طولانی است')
  .regex(EMAIL_RE, 'ایمیل معتبر نیست')
  .transform(normalizeEmail)

export const passwordField = z
  .string({ error: 'رمز عبور الزامی است' })
  .min(12, 'رمز عبور باید حداقل ۱۲ کاراکتر باشد')
  .max(128, 'رمز عبور نمی‌تواند بیش از ۱۲۸ کاراکتر باشد')
  .regex(/[A-Za-z]/, 'رمز عبور باید حداقل یک حرف داشته باشد')
  .regex(/[0-9]/, 'رمز عبور باید حداقل یک عدد داشته باشد')

export const nameField = z
  .string({ error: 'نام الزامی است' })
  .trim()
  .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
  .max(80, 'نام نمی‌تواند بیش از ۸۰ کاراکتر باشد')

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  acceptTerms: z.literal(true, { error: 'برای ادامه باید قوانین را بپذیرید' }),
})

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'رمز عبور را وارد کنید').max(128),
})

// Staff authenticate with a single high-entropy key, not email + password.
export const staffLoginSchema = z.object({
  secret: z
    .string({ error: 'کلید ورود الزامی است' })
    .trim()
    .min(32, 'کلید ورود معتبر نیست')
    .max(200, 'کلید ورود معتبر نیست'),
})

export const staffProfileSchema = z.object({
  name: nameField,
  email: emailField,
})

export const mfaVerifySchema = z.object({
  code: z.string().trim().min(6, 'کد را کامل وارد کنید').max(32, 'کد نامعتبر است'),
})

export const mfaEnableSchema = mfaVerifySchema

// Users re-enter their password, staff re-enter their login secret.
export const mfaDisableSchema = z
  .object({
    password: z.string().max(128).optional(),
    secret: z.string().trim().max(200).optional(),
    code: z.string().trim().min(6, 'کد را کامل وارد کنید').max(32, 'کد نامعتبر است'),
  })
  .refine((value) => Boolean(value.password || value.secret), {
    message: 'برای غیرفعال‌سازی، رمز عبور یا کلید امنیتی الزامی است',
  })

export const reauthSchema = z
  .object({
    password: z.string().max(128).optional(),
    secret: z.string().trim().max(200).optional(),
    code: z.string().trim().max(32).optional(),
  })
  .refine((value) => Boolean(value.password || value.secret), {
    message: 'برای تأیید هویت، کلید ورود یا رمز عبور الزامی است',
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'رمز فعلی را وارد کنید').max(128),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'تکرار رمز جدید را وارد کنید'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'تکرار رمز عبور مطابقت ندارد',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({ email: emailField })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'لینک بازیابی معتبر نیست').max(200),
    password: passwordField,
    confirmPassword: z.string().min(1, 'تکرار رمز جدید را وارد کنید'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'تکرار رمز عبور مطابقت ندارد',
    path: ['confirmPassword'],
  })

// Ticket schemas -------------------------------------------------------------

export const ticketSubjectField = z
  .string({ error: 'عنوان الزامی است' })
  .trim()
  .min(4, 'عنوان باید حداقل ۴ کاراکتر باشد')
  .max(120, 'عنوان نمی‌تواند بیش از ۱۲۰ کاراکتر باشد')

export const ticketDescriptionField = z
  .string({ error: 'شرح درخواست الزامی است' })
  .trim()
  .min(20, 'شرح باید حداقل ۲۰ کاراکتر باشد')
  .max(8000, 'شرح نمی‌تواند بیش از ۸۰۰۰ کاراکتر باشد')

export const createTicketSchema = z.object({
  subject: ticketSubjectField,
  category: z.enum(TICKET_CATEGORIES, { error: 'دسته‌بندی را انتخاب کنید' }),
  priority: z.enum(TICKET_PRIORITIES, { error: 'اولویت را انتخاب کنید' }),
  description: ticketDescriptionField,
})

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assigneeId: z.string().cuid('شناسه مدیر معتبر نیست').nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'هیچ تغییری ارسال نشده است',
  })

export const createMessageSchema = z.object({
  body: z
    .string({ error: 'متن پیام الزامی است' })
    .trim()
    .min(1, 'متن پیام الزامی است')
    .max(5000, 'متن پیام نمی‌تواند بیش از ۵۰۰۰ کاراکتر باشد'),
  visibility: z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
})

export const ticketListQuerySchema = z.object({
  q: z.string().trim().max(100, 'عبارت جستجو بیش از حد طولانی است').optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  assigneeId: z.string().max(40).optional(),
  scope: z.enum(['mine', 'all', 'unassigned']).optional(),
  sort: z.enum(['updated', 'created', 'priority']).default('updated'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const updateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'هیچ تغییری ارسال نشده است' })

export const sessionIdSchema = z.object({ id: z.string().cuid('شناسه نشست معتبر نیست') })

export const auditListQuerySchema = z.object({
  action: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>
