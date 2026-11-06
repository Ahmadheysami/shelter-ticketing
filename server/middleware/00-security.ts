import type { H3Event } from 'h3'
import { getCookie, getRequestIP, setCookie, setResponseHeader, setResponseStatus } from 'h3'
import { hashIp, randomToken } from '../utils/crypto'
import { getServerEnv } from '../utils/env'
import { checkRateLimit } from '../utils/rate-limit'
import { CSRF_COOKIE, csrfCookieOptions } from '../utils/session-cookie'

// Security headers, CSRF cookie issuance, and a coarse per-IP API limit.
// Route-level limits in handlers enforce the sensitive operations.

function securityHeaders(event: H3Event): void {
  const env = getServerEnv()
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  setResponseHeader(event, 'Cross-Origin-Opener-Policy', 'same-origin')
  setResponseHeader(event, 'Cross-Origin-Resource-Policy', 'same-origin')
  setResponseHeader(event, 'X-Permitted-Cross-Domain-Policies', 'none')

  const origin = new URL(env.appUrl)
  const wsOrigin = `${origin.protocol === 'https:' ? 'wss' : 'ws'}://${origin.host}`
  const csp = [
    "default-src 'self'",
    // Nuxt's hydration payload is inline; a nonce-based CSP is tracked in docs/SECURITY.md.
    env.isProduction
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${wsOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
  setResponseHeader(event, 'Content-Security-Policy', csp)

  if (env.isProduction) {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

export default defineEventHandler((event) => {
  const env = getServerEnv()
  securityHeaders(event)

  const path = event.path
  if (path.startsWith('/api/')) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
  }

  if (event.method === 'GET' || event.method === 'HEAD') {
    if (!getCookie(event, CSRF_COOKIE)) {
      setCookie(event, CSRF_COOKIE, randomToken(32), csrfCookieOptions())
    }
  }

  if (path.startsWith('/api/')) {
    const ip = getRequestIP(event, { xForwardedFor: env.trustProxy }) ?? 'unknown'
    const key = `global-api:${hashIp(ip) ?? ip}`
    const result = checkRateLimit(key, 300, 60 * 1000)
    if (!result.allowed) {
      setResponseHeader(event, 'retry-after', result.retryAfterSeconds)
      setResponseStatus(event, 429)
      return {
        error: {
          code: 'RATE_LIMITED',
          message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
        },
      }
    }
  }
})
