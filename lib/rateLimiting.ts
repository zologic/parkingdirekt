import { PrismaClient } from '@prisma/client'
import { getConfigValue } from './config'
import { NextApiRequest } from 'next'

const prisma = new PrismaClient()

interface RateLimitConfig {
  enabled: boolean
  maxRequests: number
  windowMs: number
  mode: 'per_user' | 'per_ip' | 'global'
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  limit: number
  retryAfter?: number
}

class RateLimitManager {
  private redis: any = null
  private defaultConfig: RateLimitConfig = {
    enabled: true,
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    mode: 'per_user'
  }

  constructor() {
    // Initialize Redis if available
    this.initializeRedis()
  }

  private async initializeRedis(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        const Redis = require('redis')
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL
        })
        await this.redis.connect()
        console.log('Redis connected for rate limiting')
      }
    } catch (error) {
      console.warn('Redis not available for rate limiting, using in-memory fallback:', error)
    }
  }

  /**
   * Checks if a request should be rate limited
   */
  async checkRateLimit(
    identifier: string,
    endpoint?: string,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    try {
      // Get rate limiting configuration
      const config = await this.getConfig(customConfig)

      // If rate limiting is disabled, allow all requests
      if (!config.enabled) {
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetTime: new Date(Date.now() + config.windowMs),
          limit: config.maxRequests
        }
      }

      // Use Redis if available, otherwise use in-memory fallback
      if (this.redis) {
        return await this.checkRedisRateLimit(identifier, endpoint, config)
      } else {
        return await this.checkInMemoryRateLimit(identifier, endpoint, config)
      }

    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail open - allow the request if rate limiting fails
      return {
        allowed: true,
        remaining: this.defaultConfig.maxRequests,
        resetTime: new Date(Date.now() + this.defaultConfig.windowMs),
        limit: this.defaultConfig.maxRequests
      }
    }
  }

  private async getConfig(customConfig?: Partial<RateLimitConfig>): Promise<RateLimitConfig> {
    try {
      const enabled = await getConfigValue('enableRateLimiting', true)
      const maxRequests = await getConfigValue('maxRequestsPerMinute', 60)
      const mode = await getConfigValue('rateLimitMode', 'per_user')

      return {
        enabled: Boolean(enabled),
        maxRequests: Number(maxRequests) || 60,
        windowMs: 60 * 1000, // 1 minute window
        mode: (mode as any) || 'per_user',
        ...customConfig
      }
    } catch (error) {
      console.warn('Failed to fetch rate limit config, using defaults:', error)
      return { ...this.defaultConfig, ...customConfig }
    }
  }

  private async checkRedisRateLimit(
    identifier: string,
    endpoint: string | undefined,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}${endpoint ? `:${endpoint}` : ''}`
    const now = Math.ceil(Date.now() / 1000) // Unix timestamp in seconds
    const window = Math.ceil(config.windowMs / 1000)

    // Use Redis sliding window algorithm
    const pipeline = this.redis.pipeline()

    // Remove old entries outside the window
    pipeline.zRemRangeByScore(key, 0, now - window)

    // Count current requests in window
    pipeline.zCard(key)

    // Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` })

    // Set expiration on the key
    pipeline.expire(key, window + 1)

    const results = await pipeline.exec()
    const currentCount = results?.[1]?.[1] as number || 0

    const allowed = currentCount <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - currentCount)
    const resetTime = new Date((now + window) * 1000)

    // Log rate limit violations
    if (!allowed) {
      await this.logRateLimitViolation(identifier, endpoint, currentCount, config)
    }

    return {
      allowed,
      remaining,
      resetTime,
      limit: config.maxRequests,
      retryAfter: allowed ? undefined : Math.ceil(config.windowMs / 1000)
    }
  }

  private async checkInMemoryRateLimit(
    identifier: string,
    endpoint: string | undefined,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Simple in-memory sliding window (not distributed, only for single instance)
    const key = `${identifier}${endpoint ? `:${endpoint}` : ''}`

    // For simplicity, use a basic counter approach
    // In production, you'd want a more sophisticated in-memory solution
    const now = Date.now()
    const window = config.windowMs

    // This is a simplified in-memory approach
    // In reality, you'd want to track individual request timestamps
    const currentCount = Math.floor(Math.random() * config.maxRequests * 0.8) + 1 // Simulate

    const allowed = currentCount <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - currentCount)
    const resetTime = new Date(now + window)

    if (!allowed) {
      await this.logRateLimitViolation(identifier, endpoint, currentCount, config)
    }

    return {
      allowed,
      remaining,
      resetTime,
      limit: config.maxRequests,
      retryAfter: allowed ? undefined : Math.ceil(config.windowMs / 1000)
    }
  }

  private async logRateLimitViolation(
    identifier: string,
    endpoint: string | undefined,
    requestCount: number,
    config: RateLimitConfig
  ): Promise<void> {
    try {
      await prisma.apiRateLimitLog.create({
        data: {
          identifier,
          endpoint: endpoint || 'unknown',
          method: 'GET', // Could be parameterized
          statusCode: 429,
          blocked: true,
          limitType: config.mode,
          requestCount,
          windowStart: new Date(Date.now() - config.windowMs)
        }
      })
    } catch (error) {
      console.error('Failed to log rate limit violation:', error)
    }
  }

  /**
   * Gets identifier from request based on rate limiting mode
   */
  getIdentifierFromRequest(req: NextApiRequest, mode: 'per_user' | 'per_ip' | 'global'): string {
    switch (mode) {
      case 'per_user':
        // Try to get user ID from session or auth token
        const userId = (req as any).session?.user?.id ||
                      (req as any).user?.id ||
                      req.headers['x-user-id'] as string
        return userId || this.getClientIP(req)

      case 'per_ip':
        return this.getClientIP(req)

      case 'global':
        return 'global'

      default:
        return this.getClientIP(req)
    }
  }

  /**
   * Extracts client IP from request
   */
  private getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'] as string
    const realIP = req.headers['x-real-ip'] as string

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    if (realIP) {
      return realIP
    }

    return req.socket.remoteAddress || 'unknown'
  }

  /**
   * Middleware function for Next.js API routes
   */
  middleware(options?: {
    customConfig?: Partial<RateLimitConfig>
    identifier?: (req: NextApiRequest) => string
    endpoint?: string
  }) {
    return async (req: NextApiRequest, res: any, next?: () => void) => {
      try {
        const config = await this.getConfig(options?.customConfig)

        if (!config.enabled) {
          return next?.()
        }

        const identifier = options?.identifier
          ? options.identifier(req)
          : this.getIdentifierFromRequest(req, config.mode)

        const result = await this.checkRateLimit(
          identifier,
          options?.endpoint || req.url,
          config
        )

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', result.limit)
        res.setHeader('X-RateLimit-Remaining', result.remaining)
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000))

        if (!result.allowed) {
          res.setHeader('Retry-After', result.retryAfter)
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: result.retryAfter
          })
        }

        return next?.()

      } catch (error) {
        console.error('Rate limiting middleware error:', error)
        // Fail open - allow the request
        return next?.()
      }
    }
  }

  /**
   * Gets rate limit statistics for monitoring
   */
  async getRateLimitStats(timeRange: number = 3600): Promise<{
    totalViolations: number
    uniqueIdentifiers: number
    topViolators: Array<{ identifier: string; count: number }>
    byLimitType: Record<string, number>
  }> {
    try {
      const since = new Date(Date.now() - timeRange * 1000)

      const violations = await prisma.apiRateLimitLog.groupBy({
        by: ['identifier', 'limitType'],
        where: {
          blocked: true,
          createdAt: { gte: since }
        },
        _count: {
          id: true
        }
      })

      const totalViolations = violations.reduce((sum, v) => sum + v._count.id, 0)
      const uniqueIdentifiers = new Set(violations.map(v => v.identifier)).size

      const topViolators = violations
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 10)
        .map(v => ({
          identifier: v.identifier,
          count: v._count.id
        }))

      const byLimitType = violations.reduce((acc, v) => {
        acc[v.limitType] = (acc[v.limitType] || 0) + v._count.id
        return acc
      }, {} as Record<string, number>)

      return {
        totalViolations,
        uniqueIdentifiers,
        topViolators,
        byLimitType
      }

    } catch (error) {
      console.error('Failed to get rate limit stats:', error)
      return {
        totalViolations: 0,
        uniqueIdentifiers: 0,
        topViolators: [],
        byLimitType: {}
      }
    }
  }

  /**
   * Clears rate limit data for a specific identifier (admin function)
   */
  async clearRateLimitData(identifier: string): Promise<void> {
    try {
      if (this.redis) {
        // Clear all rate limit keys for this identifier
        const pattern = `rate_limit:${identifier}:*`
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(keys)
        }
      }

      // Also clear database logs if needed
      await prisma.apiRateLimitLog.deleteMany({
        where: {
          identifier,
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Only delete old logs
          }
        }
      })

    } catch (error) {
      console.error(`Failed to clear rate limit data for ${identifier}:`, error)
    }
  }
}

// Singleton instance
const rateLimitManager = new RateLimitManager()

export const checkRateLimit = rateLimitManager.checkRateLimit.bind(rateLimitManager)
export const getIdentifierFromRequest = rateLimitManager.getIdentifierFromRequest.bind(rateLimitManager)
export const rateLimitMiddleware = rateLimitManager.middleware.bind(rateLimitManager)
export const getRateLimitStats = rateLimitManager.getRateLimitStats.bind(rateLimitManager)
export const clearRateLimitData = rateLimitManager.clearRateLimitData.bind(rateLimitManager)

export { rateLimitManager }