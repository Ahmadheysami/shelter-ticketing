// Fixed-window, in-memory rate limiting. Adequate for a single Node instance;
// a multi-instance deployment must replace this with a shared store. This
// limitation is documented in docs/SECURITY.md.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  sweep(now)
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) }
  }
  existing.count += 1
  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

export function clearAllRateLimits(): void {
  buckets.clear()
  lastSweep = Date.now()
}
