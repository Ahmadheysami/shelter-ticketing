// Server-only environment access with fail-fast validation.
// Never import this file from client components.

export interface ServerEnv {
  isProduction: boolean
  /** Trust X-Forwarded-For only when the app is behind a known reverse proxy. */
  trustProxy: boolean
  appUrl: string
  databaseUrl: string
  mfaEncryptionKey: Buffer
  ipHashSecret: Buffer
  /** Master secret that provisions the one-time OWNER account at startup. */
  ownerSecret: string | null
  smtp: {
    host: string
    port: number
    user?: string
    password?: string
    from: string
  } | null
}

let cached: ServerEnv | null = null

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

function secretBuffer(name: string): Buffer {
  const raw = required(name)
  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length !== 32) {
    throw new Error(`${name} must be a base64-encoded 32-byte key`)
  }
  return decoded
}

export function getServerEnv(): ServerEnv {
  if (cached && process.env.NODE_ENV !== 'test') return cached

  const appUrl = required('APP_URL')
  try {
    const parsed = new URL(appUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol')
  } catch {
    throw new Error('APP_URL must be an absolute http(s) URL')
  }

  const databaseUrl = required('DATABASE_URL')
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must point to a local SQLite file (file:...)')
  }

  const isProduction = process.env.NODE_ENV === 'production'

  const smtpHost = process.env.SMTP_HOST?.trim()
  const smtp = smtpHost
    ? {
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        // SMTP delivery only works when explicitly configured.
        user: process.env.SMTP_USER?.trim() || undefined,
        password: process.env.SMTP_PASSWORD || undefined,
        from: process.env.SMTP_FROM?.trim() || 'Support <no-reply@localhost>',
      }
    : null

  const env: ServerEnv = {
    isProduction,
    trustProxy: process.env.TRUST_PROXY === 'true',
    appUrl: appUrl.replace(/\/$/, ''),
    databaseUrl,
    mfaEncryptionKey: secretBuffer('MFA_ENCRYPTION_KEY'),
    ipHashSecret: secretBuffer('IP_HASH_SECRET'),
    ownerSecret: process.env.OWNER_SECRET?.trim() || null,
    smtp,
  }

  if (process.env.NODE_ENV !== 'test') cached = env
  return env
}

/** Used by the Nitro startup plugin to fail fast instead of at first request. */
export function assertServerEnv(): void {
  getServerEnv()
}
