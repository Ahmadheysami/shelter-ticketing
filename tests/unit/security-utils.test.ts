import { beforeEach, describe, expect, it } from 'vitest'
import { sanitizeMetadata } from '../../server/utils/audit'
import {
  decryptSecret,
  encryptSecret,
  hashStaffSecret,
  normalizeStaffSecret,
  safeEqual,
  sha256,
} from '../../server/utils/crypto'
import {
  checkRateLimit,
  clearAllRateLimits,
} from '../../server/utils/rate-limit'

describe('secret encryption', () => {
  it('round-trips TOTP secrets with authenticated encryption', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP'
    const ciphertext = encryptSecret(plaintext)
    expect(ciphertext).not.toContain(plaintext)
    expect(ciphertext.startsWith('v1.')).toBe(true)
    expect(decryptSecret(ciphertext)).toBe(plaintext)
  })

  it('rejects tampered ciphertext', () => {
    const ciphertext = encryptSecret('secret-value')
    const parts = ciphertext.split('.')
    const tampered = [parts[0], parts[1], parts[2], Buffer.from('tampered').toString('base64url')].join('.')
    expect(() => decryptSecret(tampered)).toThrow()
  })
})

describe('hashing and comparisons', () => {
  it('hashes tokens deterministically and compares safely', () => {
    expect(sha256('abc')).toBe(sha256('abc'))
    expect(sha256('abc')).not.toBe(sha256('abd'))
    expect(safeEqual('token', 'token')).toBe(true)
    expect(safeEqual('token', 'other')).toBe(false)
  })
})

describe('staff secret normalization', () => {
  const key = 'PQGg9wDx77aoC75kJu1jdSBz8fnz1emVt9STVaf5bxw'

  it('accepts a bare key, a quoted key, or a full copied env line', () => {
    expect(normalizeStaffSecret(key)).toBe(key)
    expect(normalizeStaffSecret(`  ${key}\n`)).toBe(key)
    expect(normalizeStaffSecret(`"${key}"`)).toBe(key)
    expect(normalizeStaffSecret(`OWNER_SECRET=${key}`)).toBe(key)
    expect(normalizeStaffSecret(`OWNER_SECRET = '${key}'`)).toBe(key)
  })

  it('hashes all accepted spellings to the same lookup value', () => {
    expect(hashStaffSecret(`OWNER_SECRET=${key}`)).toBe(hashStaffSecret(key))
    expect(hashStaffSecret(`"${key}"`)).toBe(hashStaffSecret(key))
  })
})

describe('audit metadata redaction', () => {
  it('drops sensitive keys and truncates long values', () => {
    const serialized = sanitizeMetadata({
      password: 'hunter2',
      token: 'abc',
      mfaSecret: 'xyz',
      reason: 'ok',
      note: 'x'.repeat(600),
    })
    expect(serialized).not.toContain('hunter2')
    expect(serialized).not.toContain('abc')
    expect(serialized).not.toContain('xyz')
    expect(serialized).toContain('"reason":"ok"')
    expect(serialized!.length).toBeLessThan(560)
  })
})

describe('rate limiting', () => {
  beforeEach(() => clearAllRateLimits())

  it('allows up to the limit and then reports retry time', () => {
    const start = 1_000_000
    expect(checkRateLimit('k', 2, 60_000, start).allowed).toBe(true)
    expect(checkRateLimit('k', 2, 60_000, start + 10).allowed).toBe(true)
    const blocked = checkRateLimit('k', 2, 60_000, start + 20)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    // A new window resets the bucket.
    expect(checkRateLimit('k', 2, 60_000, start + 61_000).allowed).toBe(true)
  })
})
