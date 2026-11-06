import QRCode from 'qrcode'
import { isStaff } from '../../shared/domain'
import type { Role, UserStatus } from '../../shared/domain'
import type { AuthResult, CurrentUser } from '../../shared/types/api'
import { writeAudit } from '../utils/audit'
import {
  decryptSecret,
  encryptSecret,
  hashStaffSecret,
  normalizeStaffSecret,
  randomToken,
  safeEqual,
  sha256,
  STAFF_SECRET_MIN_LENGTH,
} from '../utils/crypto'
import { useDb } from '../utils/db'
import { getServerEnv } from '../utils/env'
import { apiError } from '../utils/errors'
import { escapeHtml, sendMail, verificationEmail } from '../utils/mailer'
import {
  createTotpEnrollment,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from '../utils/mfa'
import { hashPassword, verifyDummyPassword, verifyPassword } from '../utils/password'
import { invalidateUserSockets } from '../utils/realtime'
import {
  createSessionToken,
  hashSessionToken,
  MFA_CHALLENGE_TTL_MS,
  SESSION_TTL_MS,
} from '../utils/session-cookie'

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  status: string
  emailVerifiedAt: Date | null
  createdAt: Date
  profileCompletedAt?: Date | null
  profileCompleted?: boolean
  staffSecretHash?: string | null
}

export function toCurrentUser(user: UserRecord, mfaEnabled: boolean): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    status: user.status as UserStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
    mfaEnabled,
    profileCompleted: user.profileCompleted ?? Boolean(user.profileCompletedAt),
    createdAt: user.createdAt.toISOString(),
  }
}

function genericLoginError(): never {
  return apiError(401, 'INVALID_CREDENTIALS', 'ایمیل یا رمز عبور نادرست است.')
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface RegisterOutcome {
  message: string
}

const GENERIC_REGISTER_MESSAGE =
  'اگر این ایمیل قابل ثبت باشد، حساب ایجاد شده و راهنمای بعدی ارسال می‌شود.'

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2002')
}

/**
 * Always returns the same response shape. If the email already exists, the
 * response is identical and the address owner receives a notice instead, so
 * registration cannot be used to enumerate accounts.
 */
export async function registerUser(input: {
  name: string
  email: string
  password: string
  ipHash: string | null
}): Promise<RegisterOutcome> {
  const db = useDb()
  const existing = await db.user.findUnique({ where: { email: input.email } })
  const passwordHash = await hashPassword(input.password)

  if (existing) {
    await sendMail({
      to: input.email,
      subject: 'درخواست ثبت‌نام تکراری',
      text: 'حسابی با این ایمیل از قبل وجود دارد. اگر رمز خود را فراموش کرده‌اید از گزینه بازیابی رمز استفاده کنید.',
      html: '<p dir="rtl">حسابی با این ایمیل از قبل وجود دارد. اگر رمز خود را فراموش کرده‌اید از گزینه بازیابی رمز استفاده کنید.</p>',
    })
    return { message: GENERIC_REGISTER_MESSAGE }
  }

  let token: string
  try {
    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: 'USER',
          status: 'ACTIVE',
          passwordChangedAt: new Date(),
        },
      })
      const rawToken = randomToken(32)
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(rawToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      await writeAudit(tx, {
        actorId: user.id,
        action: 'auth.register',
        entityType: 'User',
        entityId: user.id,
        ipHash: input.ipHash,
      })
      return rawToken
    })
    token = created
  } catch (error) {
    // Two concurrent registrations can pass the lookup above; the database
    // uniqueness constraint is the source of truth and must not leak a 500.
    if (isUniqueConstraintError(error)) return { message: GENERIC_REGISTER_MESSAGE }
    throw error
  }

  await sendVerificationEmail(input.email, input.name, token)

  return { message: GENERIC_REGISTER_MESSAGE }
}

async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${getServerEnv().appUrl}/verify-email?token=${encodeURIComponent(token)}`
  await sendMail({
    to: email,
    subject: 'تأیید ایمیل حساب',
    text: `${name} عزیز، برای تأیید ایمیل خود این لینک را باز کنید: ${url}`,
    html: verificationEmail(name, url),
  })
}

export async function resendVerification(userId: string): Promise<void> {
  const db = useDb()
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.emailVerifiedAt) return
  const rawToken = randomToken(32)
  await db.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
    await tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
  })
  await sendVerificationEmail(user.email, user.name, rawToken)
}

export async function verifyEmailToken(token: string): Promise<void> {
  const db = useDb()
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    apiError(400, 'TOKEN_INVALID', 'این لینک تأیید معتبر یا قابل استفاده نیست.')
  }
  await db.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    })
    await writeAudit(tx, {
      actorId: record.userId,
      action: 'auth.email_verified',
      entityType: 'User',
      entityId: record.userId,
    })
  })
}

// ---------------------------------------------------------------------------
// Login / logout
// ---------------------------------------------------------------------------

export interface LoginOutcome {
  token: string
  result: AuthResult
}

export async function loginUser(input: {
  email: string
  password: string
  ipHash: string | null
  userAgent: string | null
  previousToken?: string | null
}): Promise<LoginOutcome> {
  const db = useDb()
  const user = await db.user.findUnique({
    where: { email: input.email },
    include: { mfaCredential: true },
  })

  if (!user) {
    await verifyDummyPassword(input.password)
    await writeAudit(db, {
      action: 'auth.login_failed',
      entityType: 'User',
      metadata: { emailHash: sha256(input.email) },
      ipHash: input.ipHash,
    })
    return genericLoginError()
  }

  // Staff accounts are secret-only. Never accept their password path even if a
  // legacy row still has one, so the credential policy stays consistent.
  if (isStaff(user.role as Role)) {
    await verifyDummyPassword(input.password)
    await writeAudit(db, {
      actorId: user.id,
      action: 'auth.login_failed',
      entityType: 'User',
      entityId: user.id,
      metadata: { reason: 'staff_must_use_secret' },
      ipHash: input.ipHash,
    })
    return genericLoginError()
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password)
  if (!passwordValid) {
    await writeAudit(db, {
      action: 'auth.login_failed',
      entityType: 'User',
      entityId: user.id,
      ipHash: input.ipHash,
    })
    return genericLoginError()
  }

  if (user.status !== 'ACTIVE') {
    await writeAudit(db, {
      actorId: user.id,
      action: 'auth.login_blocked',
      entityType: 'User',
      entityId: user.id,
      metadata: { reason: 'account_suspended' },
      ipHash: input.ipHash,
    })
    apiError(403, 'ACCOUNT_SUSPENDED', 'این حساب غیرفعال شده است. با پشتیبانی تماس بگیرید.')
  }

  const mfaEnabled = Boolean(user.mfaCredential?.confirmedAt)
  const { token, tokenHash } = createSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (mfaEnabled ? MFA_CHALLENGE_TTL_MS : SESSION_TTL_MS))

  await db.$transaction(async (tx) => {
    if (input.previousToken) {
      await tx.session.updateMany({
        where: { tokenHash: hashSessionToken(input.previousToken), revokedAt: null },
        data: { revokedAt: now },
      })
    }
    await tx.session.create({
      data: {
        tokenHash,
        userId: user.id,
        mfaSatisfied: !mfaEnabled,
        expiresAt,
        userAgent: input.userAgent,
        ipHash: input.ipHash,
      },
    })
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } })
    await writeAudit(tx, {
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      metadata: { mfaRequired: mfaEnabled },
      ipHash: input.ipHash,
    })
  })

  return {
    token,
    result: {
      user: toCurrentUser(user, mfaEnabled),
      mfaRequired: mfaEnabled,
    },
  }
}

/**
 * Staff (ADMIN/OWNER) sign in with one high-entropy secret. There is no email
 * lookup and no password fallback: the secret itself identifies the account.
 */
export async function loginStaff(input: {
  secret: string
  ipHash: string | null
  userAgent: string | null
  previousToken?: string | null
}): Promise<LoginOutcome> {
  const db = useDb()
  const secret = normalizeStaffSecret(input.secret)
  const user =
    secret.length >= STAFF_SECRET_MIN_LENGTH
      ? await db.user.findUnique({
          where: { staffSecretHash: hashStaffSecret(secret) },
          include: { mfaCredential: true },
        })
      : null

  if (!user || !isStaff(user.role as Role)) {
    await writeAudit(db, {
      action: 'auth.staff_login_failed',
      entityType: 'User',
      ipHash: input.ipHash,
    })
    apiError(401, 'INVALID_STAFF_SECRET', 'ورود نامعتبر است.')
  }

  if (user.status !== 'ACTIVE') {
    await writeAudit(db, {
      actorId: user.id,
      action: 'auth.login_blocked',
      entityType: 'User',
      entityId: user.id,
      metadata: { reason: 'account_suspended' },
      ipHash: input.ipHash,
    })
    apiError(403, 'ACCOUNT_SUSPENDED', 'این حساب غیرفعال شده است. با مالک سیستم تماس بگیرید.')
  }

  // Two-factor is opt-in for staff: it only applies when the account itself
  // enrolled a confirmed TOTP credential.
  const mfaEnabled = Boolean(user.mfaCredential?.confirmedAt)
  const { token, tokenHash } = createSessionToken()
  const now = new Date()
  await db.$transaction(async (tx) => {
    if (input.previousToken) {
      await tx.session.updateMany({
        where: { tokenHash: hashSessionToken(input.previousToken), revokedAt: null },
        data: { revokedAt: now },
      })
    }
    await tx.session.create({
      data: {
        tokenHash,
        userId: user.id,
        mfaSatisfied: !mfaEnabled,
        expiresAt: new Date(
          now.getTime() + (mfaEnabled ? MFA_CHALLENGE_TTL_MS : SESSION_TTL_MS),
        ),
        userAgent: input.userAgent,
        ipHash: input.ipHash,
      },
    })
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } })
    await writeAudit(tx, {
      actorId: user.id,
      action: 'auth.staff_login',
      entityType: 'User',
      entityId: user.id,
      metadata: { mfaRequired: mfaEnabled },
      ipHash: input.ipHash,
    })
  })

  return {
    token,
    result: {
      user: toCurrentUser(user, mfaEnabled),
      mfaRequired: mfaEnabled,
    },
  }
}

/** Staff set their own display name and contact email after the first login. */
export async function completeStaffProfile(input: {
  userId: string
  name: string
  email: string
  ipHash: string | null
}): Promise<void> {
  const db = useDb()
  const user = await db.user.findUnique({ where: { id: input.userId } })
  if (!user || !isStaff(user.role as Role)) {
    apiError(403, 'FORBIDDEN', 'این عملیات فقط برای حساب‌های مدیریتی مجاز است.')
  }
  const duplicate = await db.user.findFirst({
    where: { email: input.email, id: { not: input.userId } },
    select: { id: true },
  })
  if (duplicate) apiError(409, 'EMAIL_IN_USE', 'این ایمیل قبلاً برای حساب دیگری ثبت شده است.')

  const emailChanged = user.email !== input.email
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        name: input.name,
        email: input.email,
        profileCompletedAt: new Date(),
        ...(emailChanged ? { emailVerifiedAt: null } : {}),
      },
    })
    await writeAudit(tx, {
      actorId: input.userId,
      action: 'user.profile_completed',
      entityType: 'User',
      entityId: input.userId,
      ipHash: input.ipHash,
    })
  })
}

export async function logoutSession(token: string, ipHash: string | null, userId?: string): Promise<void> {
  const db = useDb()
  const now = new Date()
  const session = await db.session.findUnique({ where: { tokenHash: hashSessionToken(token) } })
  if (!session) return
  await db.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now },
    })
    await writeAudit(tx, {
      actorId: userId ?? session.userId,
      action: 'auth.logout',
      entityType: 'Session',
      entityId: session.id,
      ipHash,
    })
  })
}

// ---------------------------------------------------------------------------
// MFA
// ---------------------------------------------------------------------------

export async function beginMfaSetup(userId: string): Promise<{
  secret: string
  uri: string
  qrDataUrl: string
}> {
  const db = useDb()
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { mfaCredential: true },
  })
  if (!user) apiError(404, 'NOT_FOUND', 'کاربر یافت نشد.')
  if (user.mfaCredential?.confirmedAt) {
    apiError(409, 'MFA_ALREADY_ENABLED', 'ورود دومرحله‌ای قبلاً فعال شده است.')
  }

  const enrollment = createTotpEnrollment(user.email)
  await db.mfaCredential.upsert({
    where: { userId },
    create: {
      userId,
      type: 'TOTP',
      secretCiphertext: encryptSecret(enrollment.secret),
    },
    update: {
      secretCiphertext: encryptSecret(enrollment.secret),
      confirmedAt: null,
    },
  })
  const qrDataUrl = await QRCode.toDataURL(enrollment.uri, {
    margin: 1,
    width: 240,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
  return { secret: enrollment.secret, uri: enrollment.uri, qrDataUrl }
}

export async function enableMfa(input: {
  userId: string
  sessionId: string
  code: string
  ipHash: string | null
}): Promise<{ recoveryCodes: string[] }> {
  const db = useDb()
  const credential = await db.mfaCredential.findUnique({ where: { userId: input.userId } })
  if (!credential || credential.confirmedAt) {
    apiError(400, 'MFA_NOT_PENDING', 'راه‌اندازی ورود دومرحله‌ای در وضعیت معتبر نیست.')
  }
  const secret = decryptSecret(credential.secretCiphertext)
  if (!verifyTotp(secret, input.code)) {
    apiError(400, 'MFA_CODE_INVALID', 'کد تأیید نادرست است. زمان دستگاه خود را بررسی کنید.')
  }

  const recovery = generateRecoveryCodes()
  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.mfaCredential.update({
      where: { id: credential.id },
      data: { confirmedAt: now, lastUsedAt: now },
    })
    await tx.recoveryCode.deleteMany({ where: { userId: input.userId } })
    await tx.recoveryCode.createMany({
      data: recovery.hashes.map((hash) => ({ userId: input.userId, codeHash: hash })),
    })
    await tx.session.update({
      where: { id: input.sessionId },
      data: {
        mfaSatisfied: true,
        reauthenticatedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    })
    await writeAudit(tx, {
      actorId: input.userId,
      action: 'auth.mfa_enabled',
      entityType: 'MfaCredential',
      entityId: credential.id,
      ipHash: input.ipHash,
    })
  })

  return { recoveryCodes: recovery.plaintext }
}

export interface MfaVerificationOutcome {
  /** New session token; the pre-MFA challenge token is invalid after success. */
  token: string
  result: AuthResult
}

export async function verifyMfaChallenge(input: {
  token: string
  code: string
  ipHash: string | null
}): Promise<MfaVerificationOutcome> {
  const db = useDb()
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(input.token) },
    include: { user: { include: { mfaCredential: true } } },
  })
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    apiError(401, 'MFA_CHALLENGE_EXPIRED', 'زمان تأیید دومرحله‌ای به پایان رسیده است. دوباره وارد شوید.')
  }
  if (session.user.status !== 'ACTIVE') {
    apiError(403, 'ACCOUNT_SUSPENDED', 'این حساب غیرفعال شده است.')
  }
  const credential = session.user.mfaCredential
  if (!credential?.confirmedAt) {
    apiError(400, 'MFA_NOT_CONFIGURED', 'ورود دومرحله‌ای برای این حساب فعال نیست.')
  }
  if (session.mfaSatisfied) {
    return {
      token: input.token,
      result: {
        user: toCurrentUser(session.user, true),
        mfaRequired: false,
      },
    }
  }

  const secret = decryptSecret(credential.secretCiphertext)
  let valid = verifyTotp(secret, input.code)
  let usedRecoveryCodeId: string | null = null

  if (!valid) {
    const codeHash = hashRecoveryCode(input.code)
    const recovery = await db.recoveryCode.findUnique({ where: { codeHash } })
    if (recovery && !recovery.usedAt && recovery.userId === session.userId) {
      valid = true
      usedRecoveryCodeId = recovery.id
    }
  }

  if (!valid) {
    await writeAudit(db, {
      actorId: session.userId,
      action: 'auth.mfa_failed',
      entityType: 'Session',
      entityId: session.id,
      ipHash: input.ipHash,
    })
    apiError(401, 'MFA_CODE_INVALID', 'کد تأیید نادرست است.')
  }

  const now = new Date()
  // Rotate the session identifier when the session moves from a partial
  // password-only challenge to a fully authenticated MFA session.
  const rotated = createSessionToken()
  await db.$transaction(async (tx) => {
    if (usedRecoveryCodeId) {
      await tx.recoveryCode.update({
        where: { id: usedRecoveryCodeId },
        data: { usedAt: now },
      })
    }
    await tx.session.update({
      where: { id: session.id },
      data: {
        tokenHash: rotated.tokenHash,
        mfaSatisfied: true,
        reauthenticatedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    })
    await tx.mfaCredential.update({ where: { id: credential.id }, data: { lastUsedAt: now } })
    await writeAudit(tx, {
      actorId: session.userId,
      action: 'auth.mfa_verified',
      entityType: 'Session',
      entityId: session.id,
      metadata: { method: usedRecoveryCodeId ? 'recovery_code' : 'totp' },
      ipHash: input.ipHash,
    })
  })

  return {
    token: rotated.token,
    result: {
      user: toCurrentUser(session.user, true),
      mfaRequired: false,
    },
  }
}

export async function disableMfa(input: {
  userId: string
  sessionId: string
  password?: string
  secret?: string
  code: string
  ipHash: string | null
}): Promise<void> {
  const db = useDb()
  const user = await db.user.findUnique({
    where: { id: input.userId },
    include: { mfaCredential: true },
  })
  if (!user?.mfaCredential?.confirmedAt) {
    apiError(400, 'MFA_NOT_ENABLED', 'ورود دومرحله‌ای فعال نیست.')
  }
  // Two-factor is optional, including for staff. Staff have no password, so
  // the login secret is the equivalent re-authentication factor.
  if (isStaff(user.role as Role)) {
    if (
      !input.secret ||
      !user.staffSecretHash ||
      !safeEqual(hashStaffSecret(normalizeStaffSecret(input.secret)), user.staffSecretHash)
    ) {
      apiError(401, 'INVALID_CREDENTIALS', 'کلید ورود نادرست است.')
    }
  } else if (!input.password || !(await verifyPassword(user.passwordHash, input.password))) {
    apiError(401, 'INVALID_CREDENTIALS', 'رمز عبور نادرست است.')
  }

  const secret = decryptSecret(user.mfaCredential.secretCiphertext)
  const codeHash = hashRecoveryCode(input.code)
  const recovery = await db.recoveryCode.findUnique({ where: { codeHash } })
  const recoveryValid = Boolean(recovery && !recovery.usedAt && recovery.userId === input.userId)
  if (!verifyTotp(secret, input.code) && !recoveryValid) {
    apiError(400, 'MFA_CODE_INVALID', 'کد تأیید نادرست است.')
  }

  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.mfaCredential.delete({ where: { id: user.mfaCredential!.id } })
    await tx.recoveryCode.deleteMany({ where: { userId: input.userId } })
    // Removing a security factor invalidates every other session; the current
    // session stays usable, but live sockets reconnect against the new state.
    await tx.session.updateMany({
      where: { userId: input.userId, id: { not: input.sessionId }, revokedAt: null },
      data: { revokedAt: now },
    })
    await tx.session.update({
      where: { id: input.sessionId },
      data: { mfaSatisfied: true, reauthenticatedAt: now },
    })
    await writeAudit(tx, {
      actorId: input.userId,
      action: 'auth.mfa_disabled',
      entityType: 'MfaCredential',
      entityId: user.mfaCredential!.id,
      ipHash: input.ipHash,
    })
  })
  invalidateUserSockets(input.userId)
}

export async function reauthenticate(input: {
  userId: string
  sessionId: string
  password?: string
  secret?: string
  code?: string
  ipHash: string | null
}): Promise<void> {
  const db = useDb()
  const user = await db.user.findUnique({
    where: { id: input.userId },
    include: { mfaCredential: true },
  })
  if (!user) apiError(404, 'NOT_FOUND', 'کاربر یافت نشد.')

  if (user.staffSecretHash) {
    // Staff step-up re-enters the same secret used to sign in.
    if (
      !input.secret ||
      !safeEqual(hashStaffSecret(normalizeStaffSecret(input.secret)), user.staffSecretHash)
    ) {
      apiError(401, 'INVALID_CREDENTIALS', 'کلید ورود نادرست است.')
    }
    // Only accounts that opted into TOTP have to supply a code.
    if (user.mfaCredential?.confirmedAt) {
      const totpSecret = decryptSecret(user.mfaCredential.secretCiphertext)
      if (!input.code || !verifyTotp(totpSecret, input.code)) {
        apiError(400, 'MFA_CODE_REQUIRED', 'کد ورود دومرحله‌ای را وارد کنید.')
      }
    }
  } else {
    if (!input.password || !(await verifyPassword(user.passwordHash, input.password))) {
      apiError(401, 'INVALID_CREDENTIALS', 'رمز عبور نادرست است.')
    }
    if (user.mfaCredential?.confirmedAt) {
      const totpSecret = decryptSecret(user.mfaCredential.secretCiphertext)
      if (!input.code || !verifyTotp(totpSecret, input.code)) {
        apiError(400, 'MFA_CODE_REQUIRED', 'کد ورود دومرحله‌ای را وارد کنید.')
      }
    }
  }
  await db.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: input.sessionId },
      data: { reauthenticatedAt: new Date() },
    })
    await writeAudit(tx, {
      actorId: input.userId,
      action: 'auth.reauthenticated',
      entityType: 'Session',
      entityId: input.sessionId,
      ipHash: input.ipHash,
    })
  })
}

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

export async function changePassword(input: {
  userId: string
  sessionId: string
  currentPassword: string
  newPassword: string
  ipHash: string | null
}): Promise<void> {
  const db = useDb()
  const user = await db.user.findUnique({ where: { id: input.userId } })
  if (!user) apiError(404, 'NOT_FOUND', 'کاربر یافت نشد.')
  if (isStaff(user.role as Role)) {
    apiError(403, 'STAFF_SECRET_AUTH', 'ورود حساب‌های مدیریتی با کلید امنیتی انجام می‌شود.')
  }
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    apiError(401, 'INVALID_CREDENTIALS', 'رمز عبور فعلی نادرست است.')
  }
  if (await verifyPassword(user.passwordHash, input.newPassword)) {
    apiError(422, 'PASSWORD_UNCHANGED', 'رمز جدید باید با رمز فعلی متفاوت باشد.')
  }
  const passwordHash = await hashPassword(input.newPassword)
  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { passwordHash, passwordChangedAt: now },
    })
    await tx.session.updateMany({
      where: { userId: input.userId, id: { not: input.sessionId }, revokedAt: null },
      data: { revokedAt: now },
    })
    await writeAudit(tx, {
      actorId: input.userId,
      action: 'auth.password_changed',
      entityType: 'User',
      entityId: input.userId,
      ipHash: input.ipHash,
    })
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  const db = useDb()
  const user = await db.user.findUnique({ where: { email } })
  if (!user || user.status !== 'ACTIVE') return

  const rawToken = randomToken(32)
  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
    await writeAudit(tx, {
      actorId: user.id,
      action: 'auth.password_reset_requested',
      entityType: 'User',
      entityId: user.id,
    })
  })

  const url = `${getServerEnv().appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`
  await sendMail({
    to: user.email,
    subject: 'بازیابی رمز عبور',
    text: `${user.name} عزیز، برای تعیین رمز جدید این لینک را باز کنید (اعتبار یک ساعت): ${url}`,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9"><p>${escapeHtml(user.name)} عزیز،</p><p>برای تعیین رمز جدید روی لینک زیر بزنید. این لینک یک ساعت اعتبار دارد و فقط یک بار قابل استفاده است.</p><p><a href="${escapeHtml(url)}">تعیین رمز عبور جدید</a></p><p style="color:#64748b;font-size:13px">اگر این درخواست از سوی شما نبوده است، اقدامی لازم نیست.</p></div>`,
  })
}

export async function resetPassword(input: {
  token: string
  password: string
  ipHash: string | null
}): Promise<void> {
  const db = useDb()
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(input.token) },
    include: { user: true },
  })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    apiError(400, 'TOKEN_INVALID', 'این لینک بازیابی معتبر یا قابل استفاده نیست.')
  }
  const passwordHash = await hashPassword(input.password)
  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } })
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: now },
    })
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    })
    await writeAudit(tx, {
      actorId: record.userId,
      action: 'auth.password_reset',
      entityType: 'User',
      entityId: record.userId,
      ipHash: input.ipHash,
    })
  })
  // Revoked HTTP sessions must not leave an already-open Socket.IO connection
  // receiving private ticket events.
  invalidateUserSockets(record.userId)
}
