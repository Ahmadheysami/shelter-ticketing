import { hash, verify } from '@node-rs/argon2'

// The package exposes Algorithm as an ambient const enum, which isolatedModules
// cannot reference. 2 is Algorithm.Argon2id in @node-rs/argon2.
const ARGON2ID = 2

// OWASP-recommended Argon2id baseline (19 MiB, t=2, p=1).
const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

let dummyHashPromise: Promise<string> | null = null

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, { algorithm: ARGON2ID })
  } catch {
    return false
  }
}

/**
 * Verifies against a dummy hash when the account does not exist, so login
 * timing does not reveal whether an email is registered.
 */
export async function verifyDummyPassword(password: string): Promise<void> {
  dummyHashPromise ??= hashPassword('dummy-password-value-for-timing-only')
  const dummy = await dummyHashPromise
  await verifyPassword(dummy, password)
}
