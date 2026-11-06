import { randomToken, sha256 } from './crypto'

export const SESSION_COOKIE = 'tm_session'
export const CSRF_COOKIE = 'tm_csrf'
export const CSRF_HEADER = 'x-csrf-token'

// Every authenticated session lasts one hour from login, regardless of role.
// The UI shows a live countdown and signs out when the server-side expiry hits.
export const SESSION_TTL_MS = 60 * 60 * 1000
/** A password-only login that still needs TOTP gets a short-lived session. */
export const MFA_CHALLENGE_TTL_MS = 15 * 60 * 1000
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000
export const STEP_UP_WINDOW_MS = 10 * 60 * 1000

export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomToken(32)
  return { token, tokenHash: sha256(token) }
}

export function hashSessionToken(token: string): string {
  return sha256(token)
}

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
