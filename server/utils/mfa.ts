import { randomBytes } from 'node:crypto'
import * as OTPAuth from 'otpauth'
import { sha256 } from './crypto'

const ISSUER = 'Ticketyar'
const RECOVERY_CODE_COUNT = 10

export interface TotpEnrollment {
  secret: string
  uri: string
}

export function createTotpEnrollment(email: string): TotpEnrollment {
  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })
  return { secret: secret.base32, uri: totp.toString() }
}

export function verifyTotp(secretBase32: string, token: string): boolean {
  const normalized = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    })
    // One step of clock drift is tolerated; replay protection is provided by
    // the session flow (one verification per short-lived challenge).
    return totp.validate({ token: normalized, window: 1 }) !== null
  } catch {
    return false
  }
}

/**
 * 80-bit recovery codes, shown once and stored only as SHA-256 hashes. Each
 * code is single-use; the extra entropy keeps offline guessing impractical
 * even if the recovery-code table is exposed.
 */
export function generateRecoveryCodes(): { plaintext: string[]; hashes: string[] } {
  const plaintext: string[] = []
  const hashes: string[] = []
  for (let i = 0; i < RECOVERY_CODE_COUNT; i += 1) {
    const raw = randomBytes(10).toString('hex')
    const code = `${raw.slice(0, 10)}-${raw.slice(10)}`
    plaintext.push(code)
    hashes.push(sha256(code))
  }
  return { plaintext, hashes }
}

export function hashRecoveryCode(code: string): string {
  return sha256(code.trim().toLowerCase())
}
