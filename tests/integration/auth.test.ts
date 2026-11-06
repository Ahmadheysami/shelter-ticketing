import * as OTPAuth from 'otpauth'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  beginMfaSetup,
  changePassword,
  completeStaffProfile,
  disableMfa,
  enableMfa,
  loginStaff,
  loginUser,
  registerUser,
  resetPassword,
  verifyMfaChallenge,
} from '../../server/services/auth.service'
import { loadSessionByToken } from '../../server/utils/auth'
import { hashStaffSecret, sha256 } from '../../server/utils/crypto'
import { hashSessionToken } from '../../server/utils/session-cookie'
import { useDb } from '../../server/utils/db'
import { hashPassword } from '../../server/utils/password'
import { resetDatabase } from '../helpers/db'

const PASSWORD = 'CorrectHorse123'

async function createUser(email: string, role = 'USER', password = PASSWORD) {
  return useDb().user.create({
    data: {
      name: 'کاربر آزمون',
      email,
      passwordHash: await hashPassword(password),
      role,
      status: 'ACTIVE',
      passwordChangedAt: new Date(),
    },
  })
}

const STAFF_SECRET = `test-staff-${'x'.repeat(40)}`

async function createStaff(email: string, role: 'ADMIN' | 'OWNER' = 'ADMIN') {
  return useDb().user.create({
    data: {
      name: '',
      email,
      passwordHash: await hashPassword(PASSWORD),
      staffSecretHash: hashStaffSecret(STAFF_SECRET),
      role,
      status: 'ACTIVE',
      passwordChangedAt: new Date(),
    },
  })
}

async function sessionIdFor(token: string): Promise<string> {
  const session = await useDb().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  })
  if (!session) throw new Error('session not found')
  return session.id
}

function totpCode(secret: string): string {
  return new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
  }).generate()
}

async function login(email: string, password = PASSWORD) {
  return loginUser({ email, password, ipHash: null, userAgent: 'vitest' })
}

beforeEach(async () => {
  await resetDatabase()
})

describe('registration and login', () => {
  it('registers a user without allowing client-chosen roles', async () => {
    const outcome = await registerUser({
      name: 'کاربر جدید',
      email: 'new@example.com',
      password: PASSWORD,
      ipHash: null,
    })
    expect(outcome.message).toContain('اگر این ایمیل')

    const user = await useDb().user.findUnique({ where: { email: 'new@example.com' } })
    expect(user?.role).toBe('USER')
    expect(user?.status).toBe('ACTIVE')
    expect(user?.passwordHash).not.toContain(PASSWORD)
  })

  it('returns the same generic result for an existing email and does not create a second user', async () => {
    await createUser('existing@example.com')
    const outcome = await registerUser({
      name: 'تکرار',
      email: 'existing@example.com',
      password: PASSWORD,
      ipHash: null,
    })
    expect(outcome.message).toContain('اگر این ایمیل')
    expect(await useDb().user.count()).toBe(1)
  })

  it('rejects a wrong password with a generic error', async () => {
    await createUser('user@example.com')
    await expect(login('user@example.com', 'WrongPassword123')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })
  })

  it('rejects unknown accounts identically', async () => {
    await expect(login('missing@example.com')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })
  })

  it('blocks suspended accounts even with a correct password', async () => {
    const user = await createUser('suspended@example.com')
    await useDb().user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } })
    await expect(login('suspended@example.com')).rejects.toMatchObject({
      code: 'ACCOUNT_SUSPENDED',
    })
  })

  it('creates a working session and invalidates expired sessions', async () => {
    await createUser('user@example.com')
    const session = await login('user@example.com')
    expect(await loadSessionByToken(session.token)).not.toBeNull()

    await useDb().session.update({
      where: { tokenHash: hashSessionToken(session.token) },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    })
    expect(await loadSessionByToken(session.token)).toBeNull()
  })
})

describe('staff secret authentication', () => {
  it('signs a staff member in with only the secret and a one-hour session', async () => {
    await createStaff('owner@example.com', 'OWNER')
    const outcome = await loginStaff({
      secret: STAFF_SECRET,
      ipHash: null,
      userAgent: 'vitest',
    })
    expect(outcome.result.user.role).toBe('OWNER')
    expect(outcome.result.user.profileCompleted).toBe(false)
    expect(outcome.result.mfaRequired).toBe(false)

    const loaded = await loadSessionByToken(outcome.token)
    expect(loaded?.context.session.mfaSatisfied).toBe(true)
    const session = await useDb().session.findUnique({
      where: { tokenHash: hashSessionToken(outcome.token) },
    })
    expect(session).not.toBeNull()
    const ttl = session!.expiresAt.getTime() - session!.createdAt.getTime()
    expect(ttl).toBeGreaterThanOrEqual(59 * 60 * 1000)
    expect(ttl).toBeLessThanOrEqual(60 * 60 * 1000)
  })

  it('rejects unknown and incorrect secrets with the same generic error', async () => {
    await createStaff('admin@example.com')
    await expect(
      loginStaff({ secret: `wrong-${'y'.repeat(40)}`, ipHash: null, userAgent: null }),
    ).rejects.toMatchObject({ code: 'INVALID_STAFF_SECRET', status: 401 })
    await expect(
      loginStaff({ secret: `unknown-${'z'.repeat(40)}`, ipHash: null, userAgent: null }),
    ).rejects.toMatchObject({ code: 'INVALID_STAFF_SECRET', status: 401 })
  })

  it('does not accept email/password for staff accounts', async () => {
    await createStaff('admin2@example.com')
    await expect(login('admin2@example.com')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })
  })

  it('blocks a suspended staff account even with the correct secret', async () => {
    const staff = await createStaff('suspended-staff@example.com')
    await useDb().user.update({ where: { id: staff.id }, data: { status: 'SUSPENDED' } })
    await expect(
      loginStaff({ secret: STAFF_SECRET, ipHash: null, userAgent: null }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' })
  })

  it('lets staff complete their own name and email after the first login', async () => {
    const staff = await createStaff('staff-profile@example.com')
    await completeStaffProfile({
      userId: staff.id,
      name: 'مدیر پشتیبانی',
      email: 'staff-profile@example.com',
      ipHash: null,
    })
    const updated = await useDb().user.findUnique({ where: { id: staff.id } })
    expect(updated?.name).toBe('مدیر پشتیبانی')
    expect(updated?.profileCompletedAt).not.toBeNull()
  })
})

describe('MFA', () => {
  it('requires the challenge, accepts TOTP once configured and honours recovery codes', async () => {
    const user = await createUser('mfa-user@example.com')
    const enrollment = await beginMfaSetup(user.id)
    const firstLogin = await login('mfa-user@example.com')
    const sessionId = await sessionIdFor(firstLogin.token)
    const enabled = await enableMfa({
      userId: user.id,
      sessionId,
      code: totpCode(enrollment.secret),
      ipHash: null,
    })
    expect(enabled.recoveryCodes).toHaveLength(10)
    expect(enabled.recoveryCodes[0]).toMatch(/^[a-f0-9]{10}-[a-f0-9]{10}$/)

    const secondLogin = await login('mfa-user@example.com')
    expect(secondLogin.result.mfaRequired).toBe(true)
    const pending = await useDb().session.findUnique({
      where: { tokenHash: hashSessionToken(secondLogin.token) },
    })
    expect(pending?.mfaSatisfied).toBe(false)

    const verified = await verifyMfaChallenge({
      token: secondLogin.token,
      code: totpCode(enrollment.secret),
      ipHash: null,
    })
    expect(verified.result.user.mfaEnabled).toBe(true)
    expect(verified.token).not.toBe(secondLogin.token)
    // The pre-MFA challenge token must not survive the privilege elevation.
    expect(await loadSessionByToken(secondLogin.token)).toBeNull()
    expect((await loadSessionByToken(verified.token))?.context.session.mfaSatisfied).toBe(true)

    const thirdLogin = await login('mfa-user@example.com')
    expect(thirdLogin.result.mfaRequired).toBe(true)
    await verifyMfaChallenge({
      token: thirdLogin.token,
      code: enabled.recoveryCodes[0]!,
      ipHash: null,
    })

    const fourthLogin = await login('mfa-user@example.com')
    await expect(
      verifyMfaChallenge({
        token: fourthLogin.token,
        code: enabled.recoveryCodes[0]!,
        ipHash: null,
      }),
    ).rejects.toMatchObject({ code: 'MFA_CODE_INVALID' })

    await expect(
      verifyMfaChallenge({ token: fourthLogin.token, code: '000000', ipHash: null }),
    ).rejects.toMatchObject({ code: 'MFA_CODE_INVALID' })
  })

  it('lets staff opt into MFA and only then requires the challenge', async () => {
    const admin = await createStaff('admin-optin@example.com')
    const firstLogin = await loginStaff({
      secret: STAFF_SECRET,
      ipHash: null,
      userAgent: null,
    })
    expect(firstLogin.result.mfaRequired).toBe(false)
    await expect(
      loadSessionByToken(firstLogin.token).then(
        (loaded) => loaded?.context.session.mfaSatisfied,
      ),
    ).resolves.toBe(true)

    const enrollment = await beginMfaSetup(admin.id)
    await enableMfa({
      userId: admin.id,
      sessionId: await sessionIdFor(firstLogin.token),
      code: totpCode(enrollment.secret),
      ipHash: null,
    })

    const secondLogin = await loginStaff({
      secret: STAFF_SECRET,
      ipHash: null,
      userAgent: null,
    })
    expect(secondLogin.result.mfaRequired).toBe(true)
    const sessionId = await sessionIdFor(secondLogin.token)
    expect((await loadSessionByToken(secondLogin.token))?.context.session.mfaSatisfied).toBe(false)

    await expect(
      verifyMfaChallenge({ token: secondLogin.token, code: '000000', ipHash: null }),
    ).rejects.toMatchObject({ code: 'MFA_CODE_INVALID' })

    const staffVerified = await verifyMfaChallenge({
      token: secondLogin.token,
      code: totpCode(enrollment.secret),
      ipHash: null,
    })
    expect(await loadSessionByToken(secondLogin.token)).toBeNull()
    expect((await loadSessionByToken(staffVerified.token))?.context.session.mfaSatisfied).toBe(true)

    // Disabling a staff credential needs the login secret, not a password.
    await expect(
      disableMfa({
        userId: admin.id,
        sessionId,
        password: PASSWORD,
        code: totpCode(enrollment.secret),
        ipHash: null,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    await disableMfa({
      userId: admin.id,
      sessionId,
      secret: STAFF_SECRET,
      code: totpCode(enrollment.secret),
      ipHash: null,
    })
    expect(await useDb().mfaCredential.findUnique({ where: { userId: admin.id } })).toBeNull()

    const thirdLogin = await loginStaff({
      secret: STAFF_SECRET,
      ipHash: null,
      userAgent: null,
    })
    expect(thirdLogin.result.mfaRequired).toBe(false)
  })

  it('does not accept a TOTP code for an account that has no confirmed credential', async () => {
    await createUser('no-mfa@example.com')
    const session = await login('no-mfa@example.com')
    await expect(
      verifyMfaChallenge({ token: session.token, code: '123456', ipHash: null }),
    ).rejects.toMatchObject({ code: 'MFA_NOT_CONFIGURED' })
  })
})

describe('password lifecycle', () => {
  it('revokes sibling sessions on password change and keeps the current one', async () => {
    const user = await createUser('user@example.com')
    const first = await login('user@example.com')
    const second = await login('user@example.com')

    await changePassword({
      userId: user.id,
      sessionId: await sessionIdFor(first.token),
      currentPassword: PASSWORD,
      newPassword: 'AnotherValidPass456',
      ipHash: null,
    })

    expect(await loadSessionByToken(first.token)).not.toBeNull()
    expect(await loadSessionByToken(second.token)).toBeNull()
    await expect(login('user@example.com', PASSWORD)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    await expect(login('user@example.com', 'AnotherValidPass456')).resolves.toBeTruthy()
  })

  it('uses single-use, hashed reset tokens and revokes all sessions', async () => {
    const user = await createUser('reset@example.com')
    const active = await login('reset@example.com')
    const rawToken = 'test-reset-token-1234567890abcdef'
    await useDb().passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await resetPassword({ token: rawToken, password: 'BrandNewPass789', ipHash: null })
    expect(await loadSessionByToken(active.token)).toBeNull()
    await expect(
      resetPassword({ token: rawToken, password: 'BrandNewPass789', ipHash: null }),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALID' })
    await expect(login('reset@example.com', 'BrandNewPass789')).resolves.toBeTruthy()
  })

  it('stores reset tokens only as hashes', async () => {
    await createUser('hashed@example.com')
    const { requestPasswordReset } = await import('../../server/services/auth.service')
    await requestPasswordReset('hashed@example.com')
    const token = await useDb().passwordResetToken.findFirst()
    expect(token?.tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
