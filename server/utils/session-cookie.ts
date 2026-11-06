import { randomToken, sha256 } from './crypto'
import { isLocalAppUrl } from './env'

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

/**
 * `nuxt preview` runs with NODE_ENV=production. Some browsers refuse to store
 * Secure cookies received over plain HTTP, even on loopback hosts, so a local
 * preview would create a server session that the browser never sends back.
 * Keep Secure for real production origins and disable it for local previews.
 */
function useSecureCookies(): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  return !isLocalAppUrl(process.env.APP_URL ?? '')
}

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: useSecureCookies(),
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: useSecureCookies(),
    path: '/',
  }
}
