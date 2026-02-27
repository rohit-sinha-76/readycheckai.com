import { describe, it, expect } from 'vitest'
import { checkRateLimit, checkAdminRateLimit } from '@/lib/rate-limiter'

describe('Rate Limiter Module - src/lib/rate-limiter.ts', () => {
  it('should grant rate limit access when fallback in-memory mode is active', async () => {
    const result = await checkRateLimit('test-ip-123', 10, 60)

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(10)
    expect(result.remaining).toBe(9)
    expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('should apply stricter admin rate limits of 10 requests per minute', async () => {
    const adminResult = await checkAdminRateLimit('admin-user-001')

    expect(adminResult.allowed).toBe(true)
    expect(adminResult.limit).toBe(10)
  })
})
