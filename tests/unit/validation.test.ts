import { describe, expect, it } from 'vitest'
import { canRequesterTransition } from '../../shared/domain'
import {
  createMessageSchema,
  createTicketSchema,
  registerSchema,
  updateTicketSchema,
  userListQuerySchema,
} from '../../shared/validation'

describe('registration validation', () => {
  const base = {
    name: 'کاربر آزمون',
    email: 'User@Example.com ',
    password: 'CorrectHorse123',
    acceptTerms: true,
  }

  it('normalizes email and strips privilege fields sent by a client', () => {
    const result = registerSchema.safeParse({ ...base, role: 'OWNER', status: 'ACTIVE' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
      expect('role' in result.data).toBe(false)
      expect('status' in result.data).toBe(false)
    }
  })

  it('requires a strong password and accepted terms', () => {
    expect(registerSchema.safeParse({ ...base, password: 'short1' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: 'alllettersonly' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false)
  })

  it('rejects invalid email formats', () => {
    expect(registerSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false)
  })
})

describe('ticket validation', () => {
  const ticket = {
    subject: 'خطا در ورود به حساب',
    category: 'TECHNICAL',
    priority: 'HIGH',
    description: 'پس از تغییر رمز، پیام خطا دریافت می‌کنم و نمی‌توانم وارد شوم.',
  }

  it('accepts a complete ticket', () => {
    expect(createTicketSchema.safeParse(ticket).success).toBe(true)
  })

  it('rejects unknown status/priority and short descriptions', () => {
    expect(createTicketSchema.safeParse({ ...ticket, category: 'HACK' }).success).toBe(false)
    expect(createTicketSchema.safeParse({ ...ticket, priority: 'CRITICAL' }).success).toBe(false)
    expect(createTicketSchema.safeParse({ ...ticket, description: 'خیلی کوتاه' }).success).toBe(false)
  })

  it('rejects an empty update payload', () => {
    expect(updateTicketSchema.safeParse({}).success).toBe(false)
    expect(updateTicketSchema.safeParse({ status: 'OPEN' }).success).toBe(true)
  })

  it('defaults message visibility to public and caps length', () => {
    const parsed = createMessageSchema.safeParse({ body: 'سلام' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.visibility).toBe('PUBLIC')
    expect(createMessageSchema.safeParse({ body: 'x'.repeat(5001) }).success).toBe(false)
  })

  it('caps list page size to prevent unbounded reads', () => {
    expect(userListQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false)
    expect(userListQuerySchema.safeParse({ pageSize: '20' }).success).toBe(true)
  })
})

describe('reopen policy is documented and enforced in one place', () => {
  it('does not allow reopening an open ticket', () => {
    expect(canRequesterTransition('OPEN', 'OPEN', null, null, new Date())).toBe(false)
  })
})
