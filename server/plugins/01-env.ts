import { assertServerEnv, getServerEnv } from '../utils/env'

// Fail fast on missing or malformed secrets instead of at first request.
export default defineNitroPlugin(() => {
  assertServerEnv()
  const env = getServerEnv()
  if (env.isProduction && !env.appUrl.startsWith('https://')) {
    console.warn('[security] APP_URL is not HTTPS in production. Use TLS behind a trusted reverse proxy.')
  }
  if (env.isProduction && !env.smtp) {
    console.warn('[mail] SMTP is not configured. Verification and reset emails will not be delivered.')
  }
})
