type RateLimitEntry = {
  tokens: number
  lastRefill: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxTokens: number
  refillRate: number
  refillIntervalMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 20,
  refillRate: 1,
  refillIntervalMs: 1000,
}

export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const { maxTokens, refillRate, refillIntervalMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()

  let entry = store.get(key)
  if (!entry) {
    entry = { tokens: maxTokens, lastRefill: now }
    store.set(key, entry)
  }

  const elapsed = now - entry.lastRefill
  const refills = Math.floor(elapsed / refillIntervalMs)
  if (refills > 0) {
    entry.tokens = Math.min(maxTokens, entry.tokens + refills * refillRate)
    entry.lastRefill = now
  }

  if (entry.tokens > 0) {
    entry.tokens--
    return { allowed: true, remaining: entry.tokens }
  }

  const retryAfterMs = refillIntervalMs - (elapsed % refillIntervalMs)
  return { allowed: false, remaining: 0, retryAfterMs }
}

const AI_RATE_LIMIT: Partial<RateLimitConfig> = {
  maxTokens: 10,
  refillRate: 1,
  refillIntervalMs: 3000,
}

export function checkAIRateLimit(identifier: string) {
  return checkRateLimit(`ai:${identifier}`, AI_RATE_LIMIT)
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000
    store.forEach((entry, key) => {
      if (now - entry.lastRefill > staleThreshold) {
        store.delete(key)
      }
    })
  }, 60_000)
}
