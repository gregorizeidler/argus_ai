import { checkRateLimit } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-${Date.now()}`
    const result = checkRateLimit(key, { maxTokens: 5, refillRate: 1, refillIntervalMs: 60000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks after exceeding limit', () => {
    const key = `test-exhaust-${Date.now()}`
    const config = { maxTokens: 2, refillRate: 1, refillIntervalMs: 60000 }

    checkRateLimit(key, config)
    checkRateLimit(key, config)
    const third = checkRateLimit(key, config)

    expect(third.allowed).toBe(false)
    expect(third.remaining).toBe(0)
    expect(third.retryAfterMs).toBeGreaterThan(0)
  })

  it('different keys are independent', () => {
    const key1 = `test-a-${Date.now()}`
    const key2 = `test-b-${Date.now()}`
    const config = { maxTokens: 1, refillRate: 1, refillIntervalMs: 60000 }

    checkRateLimit(key1, config)
    const result = checkRateLimit(key2, config)

    expect(result.allowed).toBe(true)
  })
})
