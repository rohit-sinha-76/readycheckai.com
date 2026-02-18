import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = redisUrl && redisToken && !redisUrl.includes('dummy')
  ? new Redis({ url: redisUrl, token: redisToken })
  : null

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

const inMemoryStore = new Map<string, number[]>()

function checkInMemoryRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - windowSeconds
  const timestamps = (inMemoryStore.get(identifier) || []).filter(ts => ts > windowStart)
  
  const allowed = timestamps.length < maxRequests
  if (allowed) {
    timestamps.push(now)
  }
  inMemoryStore.set(identifier, timestamps)

  if (inMemoryStore.size > 1000) {
    for (const [k, v] of inMemoryStore.entries()) {
      if (v.every(ts => ts <= windowStart)) {
        inMemoryStore.delete(k)
      }
    }
  }

  return {
    allowed,
    remaining: Math.max(0, maxRequests - timestamps.length),
    resetAt: now + windowSeconds,
    limit: maxRequests,
  }
}

export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!redis) {
    return checkInMemoryRateLimit(identifier, maxRequests, windowSeconds)
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - windowSeconds
    const key = `rate_limit:${identifier}`

    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random().toString(36).slice(2)}` })
    pipeline.expire(key, windowSeconds)

    const [, currentCount] = await pipeline.exec()
    const count = (currentCount as number) ?? 0
    const allowed = count < maxRequests

    return {
      allowed,
      remaining: Math.max(0, maxRequests - count - 1),
      resetAt: now + windowSeconds,
      limit: maxRequests,
    }
  } catch {
    return checkInMemoryRateLimit(identifier, maxRequests, windowSeconds)
  }
}

// Admin-specific stricter limits
export async function checkAdminRateLimit(adminId: string): Promise<RateLimitResult> {
  return checkRateLimit(`admin:${adminId}`, 10, 60) // 10 req/min
}
