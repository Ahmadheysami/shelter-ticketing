import { assertServerEnv, getServerEnv, isLocalAppUrl } from '../utils/env'

// Fail fast on missing or malformed secrets instead of at first request.
export default defineNitroPlugin(() => {
  assertServerEnv()
  const env = getServerEnv()
  // `nuxt preview` runs with NODE_ENV=production. Do not present local
  // previews as misconfigured production deployments.
  const local = isLocalAppUrl(env.appUrl)
  if (env.isProduction && !local && !env.appUrl.startsWith('https://')) {
    console.warn(
      '[security] APP_URL must be the public HTTPS origin in production. ' +
        'Use TLS behind a trusted reverse proxy.',
    )
  }
  if (env.isProduction && !local && !env.smtp) {
    console.warn(
      '[mail] SMTP is not configured; verification and password-reset emails cannot be delivered. ' +
        'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.',
    )
  }
})
