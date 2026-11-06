// Central domain vocabulary, permission matrix, and workflow rules.
// This file is intentionally framework-free so it can be shared by the Vue
// client, Nitro handlers, CLI scripts, and unit tests.

export const ROLES = ['USER', 'ADMIN', 'OWNER'] as const
export type Role = (typeof ROLES)[number]

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const TICKET_CATEGORIES = [
  'ACCOUNT',
  'BILLING',
  'TECHNICAL',
  'FEATURE_REQUEST',
  'OTHER',
] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const MESSAGE_VISIBILITIES = ['PUBLIC', 'INTERNAL'] as const
export type MessageVisibility = (typeof MESSAGE_VISIBILITIES)[number]

export const STAFF_ROLES: readonly Role[] = ['ADMIN', 'OWNER']

export function isStaff(role: Role): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export const PERMISSIONS = [
  'tickets:create',
  'tickets:read:own',
  'tickets:read:all',
  'tickets:reply:public',
  'tickets:note:internal',
  'tickets:manage',
  'dashboard:admin',
  'users:read',
  'users:manage',
  'users:roles',
  'audit:read',
  'security:manage',
  'sessions:read:all',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const USER_PERMISSIONS: readonly Permission[] = [
  'tickets:create',
  'tickets:read:own',
  'tickets:reply:public',
]

const ADMIN_PERMISSIONS: readonly Permission[] = [
  ...USER_PERMISSIONS,
  'tickets:read:all',
  'tickets:note:internal',
  'tickets:manage',
  'dashboard:admin',
  'users:read',
  'users:manage',
]

const OWNER_PERMISSIONS: readonly Permission[] = [
  ...ADMIN_PERMISSIONS,
  'users:roles',
  'audit:read',
  'security:manage',
  'sessions:read:all',
]

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  USER: USER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  OWNER: OWNER_PERMISSIONS,
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function can(role: Role, permission: Permission): boolean {
  return permissionsFor(role).includes(permission)
}

// ---------------------------------------------------------------------------
// Ticket workflow
// ---------------------------------------------------------------------------

/** Transitions a staff member may perform. Closing/reopening is deliberate. */
const STAFF_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_USER: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['OPEN'],
}

export function canStaffTransition(from: TicketStatus, to: TicketStatus): boolean {
  return STAFF_TRANSITIONS[from].includes(to)
}

/** How many days after resolution/closure a requester may reopen a ticket. */
export const REOPEN_WINDOW_DAYS = 14

/**
 * The requester may cancel (close) a ticket that is not already closed, and
 * reopen a resolved/closed ticket only inside the documented window.
 */
export function canRequesterTransition(
  from: TicketStatus,
  to: TicketStatus,
  closedAt: Date | null,
  resolvedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (to === 'CLOSED') return from !== 'CLOSED'
  if (to !== 'OPEN') return false
  if (from === 'RESOLVED' || from === 'CLOSED') {
    const reference = closedAt ?? resolvedAt
    if (!reference) return false
    const ageMs = now.getTime() - reference.getTime()
    return ageMs >= 0 && ageMs <= REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  }
  return false
}

export function ticketReference(id: number): string {
  return `TK-${String(id).padStart(5, '0')}`
}

// ---------------------------------------------------------------------------
// Presentation labels (Persian UI)
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'کاربر',
  ADMIN: 'مدیر',
  OWNER: 'مالک سیستم',
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'فعال',
  SUSPENDED: 'تعلیق‌شده',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  WAITING_FOR_USER: 'منتظر پاسخ کاربر',
  RESOLVED: 'حل‌شده',
  CLOSED: 'بسته',
}

export const STATUS_DESCRIPTIONS: Record<TicketStatus, string> = {
  OPEN: 'درخواست ثبت شده و در انتظار بررسی است.',
  IN_PROGRESS: 'تیم پشتیبانی در حال بررسی این درخواست است.',
  WAITING_FOR_USER: 'برای ادامه کار به پاسخ شما نیاز است.',
  RESOLVED: 'راه‌حل ارائه شده است؛ در صورت نیاز می‌توانید بازگشایی کنید.',
  CLOSED: 'این درخواست بسته شده است.',
}

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'کم',
  NORMAL: 'معمولی',
  HIGH: 'زیاد',
  URGENT: 'فوری',
}

export const PRIORITY_HINTS: Record<TicketPriority, string> = {
  LOW: 'سوال عمومی یا درخواست غیرفوری',
  NORMAL: 'مشکل معمولی که روی کار روزانه اثر دارد',
  HIGH: 'اختلال مهم با راه‌حل موقت محدود',
  URGENT: 'توقف کامل سرویس یا ریسک امنیتی',
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ACCOUNT: 'حساب کاربری',
  BILLING: 'پرداخت و صورتحساب',
  TECHNICAL: 'مشکل فنی',
  FEATURE_REQUEST: 'درخواست قابلیت',
  OTHER: 'سایر موارد',
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'ورود به سیستم',
  'auth.login_failed': 'تلاش ناموفق ورود',
  'auth.logout': 'خروج از سیستم',
  'auth.register': 'ثبت‌نام',
  'auth.mfa_enabled': 'فعال‌سازی ورود دومرحله‌ای',
  'auth.mfa_disabled': 'غیرفعال‌سازی ورود دومرحله‌ای',
  'auth.mfa_failed': 'تلاش ناموفق ورود دومرحله‌ای',
  'auth.password_changed': 'تغییر رمز عبور',
  'auth.password_reset_requested': 'درخواست بازیابی رمز',
  'auth.password_reset': 'بازیابی رمز عبور',
  'auth.email_verified': 'تأیید ایمیل',
  'auth.email_verification_sent': 'ارسال ایمیل تأیید',
  'auth.mfa_verified': 'تأیید دومرحله‌ای موفق',
  'auth.login_blocked': 'ورود مسدودشده',
  'owner.bootstrap': 'راه‌اندازی اولیه مالک',
  'auth.reauthenticated': 'احراز هویت مجدد',
  'session.revoked': 'ابطال نشست',
  'ticket.created': 'ثبت تیکت',
  'ticket.status_changed': 'تغییر وضعیت تیکت',
  'ticket.priority_changed': 'تغییر اولویت تیکت',
  'ticket.assigned': 'تخصیص تیکت',
  'ticket.message_public': 'پاسخ عمومی',
  'ticket.message_internal': 'یادداشت داخلی',
  'user.role_changed': 'تغییر نقش کاربر',
  'user.status_changed': 'تغییر وضعیت کاربر',
  'user.created': 'ایجاد کاربر',
}
