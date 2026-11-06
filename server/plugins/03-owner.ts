import { getServerEnv } from '../utils/env'
import { ensureOwnerAccount } from '../services/owner.service'

/**
 * One-time-per-startup OWNER reconciliation from OWNER_SECRET.
 * The service creates an owner only when none exists and never duplicates it.
 */
export default defineNitroPlugin(async () => {
  try {
    const { action } = await ensureOwnerAccount(getServerEnv().ownerSecret)
    if (action === 'disabled') {
      console.warn('[owner] OWNER_SECRET is not set; automatic owner provisioning is disabled.')
    } else if (action === 'invalid') {
      console.error('[owner] OWNER_SECRET is shorter than the minimum; owner provisioning skipped.')
    } else if (action === 'created') {
      console.info('[owner] OWNER account created from OWNER_SECRET. Sign in at /admin/login.')
    } else if (action === 'synced') {
      console.info('[owner] OWNER key synced with OWNER_SECRET.')
    }
  } catch (error) {
    console.error(
      '[owner] Provisioning failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
  }
})
