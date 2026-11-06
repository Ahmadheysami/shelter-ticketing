import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  csrfCookieOptions,
  sessionCookieOptions,
} from '../../server/utils/session-cookie'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('cookie security flags', () => {
  it('does not set Secure in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('APP_URL', 'https://support.example.com')
    expect(sessionCookieOptions(60_000).secure).toBe(false)
    expect(csrfCookieOptions().secure).toBe(false)
  })

  it('does not set Secure for a local production preview over HTTP', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'http://localhost:3000')
    expect(sessionCookieOptions(60_000).secure).toBe(false)
    expect(csrfCookieOptions().secure).toBe(false)
  })

  it('sets Secure for a public production origin', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'https://support.example.com')
    expect(sessionCookieOptions(60_000).secure).toBe(true)
    expect(csrfCookieOptions().secure).toBe(true)
  })

  it('fails closed when APP_URL is missing or invalid', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', '')
    expect(sessionCookieOptions(60_000).secure).toBe(true)
    vi.stubEnv('APP_URL', 'not a url')
    expect(sessionCookieOptions(60_000).secure).toBe(true)
  })
})
