import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { getServerEnv } from './env'

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

/**
 * Normalizes a pasted staff secret. People often copy the whole env line or a
 * quoted value; the random key itself never contains whitespace, quotes, or an
 * `OWNER_SECRET=` prefix, so stripping those cannot turn a wrong key into a
 * right one.
 */
export function normalizeStaffSecret(secret: string): string {
  let value = secret.trim()
  value = value.replace(/^OWNER_SECRET\s*=\s*/i, '').trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  return value.replace(/\s+/g, '')
}

/**
 * Lookup hash for staff login secrets. Secrets are 256-bit random values (or a
 * long operator-provided OWNER_SECRET), so a fast hash is sufficient and lets
 * us find the account by the credential without scanning every user row.
 */
export function hashStaffSecret(secret: string): string {
  return sha256(`staff-secret:${normalizeStaffSecret(secret)}`)
}

export const STAFF_SECRET_MIN_LENGTH = 32

/** Stable one-way pseudonym for an IP address; raw IPs are never stored. */
export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null
  const env = getServerEnv()
  return createHmac('sha256', env.ipHashSecret).update(ip).digest('hex').slice(0, 32)
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

/**
 * Encrypts TOTP secrets at rest with AES-256-GCM. The output format is
 * v1.<iv>.<authTag>.<ciphertext>, all base64url.
 */
export function encryptSecret(plaintext: string): string {
  const key = getServerEnv().mfaEncryptionKey
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Malformed encrypted secret')
  const key = getServerEnv().mfaEncryptionKey
  const iv = Buffer.from(parts[1]!, 'base64url')
  const tag = Buffer.from(parts[2]!, 'base64url')
  const ciphertext = Buffer.from(parts[3]!, 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
