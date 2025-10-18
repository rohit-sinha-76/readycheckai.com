/**
 * ReadyCheck AI - Production Security Hardening
 * Phase 6: Rate limiting, DDoS protection, input validation
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { z } from 'zod'

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints
  '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  '/api/auth/signup': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 signups per hour
  '/api/auth/reset-password': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  
  // Assessment endpoints
  '/api/assessment/start': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 starts per minute
  '/api/assessment/submit': { windowMs: 60 * 1000, maxRequests: 20 }, // 20 submissions per minute
  
  // Certificate verification
  '/api/certificates/verify': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 verifications per minute
  
  // Payment endpoints
  '/api/payments/create-order': { windowMs: 60 * 1000, maxRequests: 5 },
  '/api/payments/webhook': { windowMs: 60 * 1000, maxRequests: 1000 }, // High limit for webhooks
  
  // Default for other endpoints
  'default': { windowMs: 60 * 1000, maxRequests: 60 } // 60 requests per minute
}

// ============================================================================
// RATE LIMITING IMPLEMENTATION
// ============================================================================

export class RateLimiter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async checkRateLimit(
    identifier: string,
    identifierType: 'ip' | 'user' | 'api_key',
    endpoint: string,
    config?: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const limitConfig = config || RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default
    
    try {
      const { data, error } = await this.supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_identifier_type: identifierType,
        p_endpoint: endpoint,
        p_limit: limitConfig.maxRequests,
        p_window_seconds: Math.floor(limitConfig.windowMs / 1000)
      })

      if (error) {
        console.error('Rate limit check failed:', error)
        // Fail open - allow request if rate limiting is down
        return {
          allowed: true,
          remaining: limitConfig.maxRequests,
          resetTime: new Date(Date.now() + limitConfig.windowMs)
        }
      }

      const resetTime = new Date(Date.now() + limitConfig.windowMs)
      
      return {
        allowed: data as boolean,
        remaining: data ? limitConfig.maxRequests - 1 : 0,
        resetTime
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fail open
      return {
        allowed: true,
        remaining: limitConfig.maxRequests,
        resetTime: new Date(Date.now() + limitConfig.windowMs)
      }
    }
  }

  async recordRequest(
    identifier: string,
    identifierType: 'ip' | 'user' | 'api_key',
    endpoint: string
  ): Promise<void> {
    try {
      await this.supabase.from('rate_limits').insert({
        identifier,
        identifier_type: identifierType,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to record rate limit:', error)
    }
  }
}

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

export const ValidationSchemas = {
  // User input validation
  userRegistration: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    fullName: z.string().min(2).max(100).regex(/^[a-zA-Z\s'-]+$/),
    company: z.string().max(100).optional(),
    jobTitle: z.string().max(100).optional()
  }),

  userLogin: z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(128)
  }),

  // Assessment validation
  assessmentStart: z.object({
    assessmentType: z.enum(['practice', 'certification']),
    categoryId: z.string().uuid().optional(),
    certificationLevel: z.enum(['RCAF', 'RCAP', 'RCGS', 'RCSA']).optional(),
    timeLimit: z.number().min(300).max(7200).optional() // 5 minutes to 2 hours
  }),

  assessmentAnswer: z.object({
    questionId: z.string().uuid(),
    selectedOptions: z.array(z.string()).min(1).max(10),
    textAnswer: z.string().max(5000).optional(),
    timeSpent: z.number().min(0).max(3600) // Max 1 hour per question
  }),

  // Certificate verification
  certificateVerification: z.object({
    verificationCode: z.string().regex(/^RC-[A-Z0-9]{8}-[A-Z0-9]{8}$/),
    accessorInfo: z.object({
      organizationName: z.string().max(200).optional(),
      verifierName: z.string().max(100).optional(),
      purpose: z.string().max(500).optional()
    }).optional()
  }),

  // Payment validation
  paymentOrder: z.object({
    planId: z.string().uuid(),
    currency: z.enum(['INR', 'USD']),
    amount: z.number().min(1).max(100000), // ₹1 to ₹1,00,000
    customerInfo: z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional()
    })
  })
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.razorpay.com",
    "frame-src https://api.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ')
}

// ============================================================================
// REQUEST VALIDATION UTILITIES
// ============================================================================

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return (req as any).ip || 'unknown'
}

export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown'
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

export function validateCSRFToken(req: NextRequest, expectedToken: string): boolean {
  const token = req.headers.get('x-csrf-token') || req.headers.get('x-requested-with')
  return token === expectedToken || token === 'XMLHttpRequest'
}

// ============================================================================
// DDOS PROTECTION
// ============================================================================

export class DDoSProtection {
  private static suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|java|go-http/i,
    /attack|hack|exploit|inject/i
  ]

  static isSuspiciousUserAgent(userAgent: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  static async checkRequestPattern(
    ip: string,
    endpoint: string,
    timeWindow: number = 60000 // 1 minute
  ): Promise<{ suspicious: boolean; reason?: string }> {
    // This would integrate with your monitoring system
    // For now, implement basic checks
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const { data: recentRequests } = await supabase
        .from('api_performance')
        .select('endpoint, created_at, status_code')
        .eq('endpoint', endpoint)
        .gte('created_at', new Date(Date.now() - timeWindow).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (!recentRequests || recentRequests.length === 0) {
        return { suspicious: false }
      }

      // Check for rapid-fire requests
      const requestTimes = recentRequests.map(r => new Date(r.created_at).getTime())
      const intervals = []
      for (let i = 1; i < requestTimes.length; i++) {
        intervals.push(requestTimes[i-1] - requestTimes[i])
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      if (avgInterval < 100) { // Less than 100ms between requests
        return { suspicious: true, reason: 'Rapid-fire requests detected' }
      }

      // Check for high error rates
      const errorCount = recentRequests.filter(r => r.status_code >= 400).length
      const errorRate = errorCount / recentRequests.length
      if (errorRate > 0.5) { // More than 50% errors
        return { suspicious: true, reason: 'High error rate detected' }
      }

      return { suspicious: false }
    } catch (error) {
      console.error('DDoS check failed:', error)
      return { suspicious: false }
    }
  }
}

// ============================================================================
// API PERFORMANCE MONITORING
// ============================================================================

export class APIMonitor {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async recordAPICall(
    endpoint: string,
    method: string,
    responseTimeMs: number,
    statusCode: number,
    userId?: string,
    sessionId?: string,
    errorMessage?: string,
    requestSizeBytes?: number,
    responseSizeBytes?: number
  ): Promise<void> {
    try {
      await this.supabase.from('api_performance').insert({
        endpoint,
        method,
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        user_id: userId,
        session_id: sessionId,
        error_message: errorMessage,
        request_size_bytes: requestSizeBytes,
        response_size_bytes: responseSizeBytes
      })
    } catch (error) {
      console.error('Failed to record API performance:', error)
    }
  }

  async getPerformanceMetrics(
    endpoint?: string,
    timeRange: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<{
    averageResponseTime: number
    errorRate: number
    requestCount: number
    p95ResponseTime: number
  }> {
    try {
      let query = this.supabase
        .from('api_performance')
        .select('response_time_ms, status_code')
        .gte('created_at', new Date(Date.now() - timeRange).toISOString())

      if (endpoint) {
        query = query.eq('endpoint', endpoint)
      }

      const { data: metrics } = await query

      if (!metrics || metrics.length === 0) {
        return {
          averageResponseTime: 0,
          errorRate: 0,
          requestCount: 0,
          p95ResponseTime: 0
        }
      }

      const responseTimes = metrics.map(m => m.response_time_ms).sort((a, b) => a - b)
      const errorCount = metrics.filter(m => m.status_code >= 400).length

      return {
        averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        errorRate: errorCount / metrics.length,
        requestCount: metrics.length,
        p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return {
        averageResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        p95ResponseTime: 0
      }
    }
  }
}

// ============================================================================
// SECURITY MIDDLEWARE FACTORY
// ============================================================================

export function createSecurityMiddleware(options: {
  rateLimitConfig?: RateLimitConfig
  enableDDoSProtection?: boolean
  enableCSRFProtection?: boolean
  customValidation?: (req: NextRequest) => Promise<boolean>
}) {
  const rateLimiter = new RateLimiter()
  const apiMonitor = new APIMonitor()

  return async function securityMiddleware(
    req: NextRequest,
    endpoint: string
  ): Promise<{
    allowed: boolean
    response?: Response
    headers?: Record<string, string>
  }> {
    const startTime = Date.now()
    const clientIP = getClientIP(req)
    const userAgent = getUserAgent(req)

    try {
      // DDoS Protection
      if (options.enableDDoSProtection) {
        if (DDoSProtection.isSuspiciousUserAgent(userAgent)) {
          await apiMonitor.recordAPICall(
            endpoint, req.method, Date.now() - startTime, 403,
            undefined, undefined, 'Suspicious user agent blocked'
          )
          
          return {
            allowed: false,
            response: new Response(JSON.stringify({ error: 'Access denied' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }

        const ddosCheck = await DDoSProtection.checkRequestPattern(clientIP, endpoint)
        if (ddosCheck.suspicious) {
          await apiMonitor.recordAPICall(
            endpoint, req.method, Date.now() - startTime, 429,
            undefined, undefined, `DDoS protection: ${ddosCheck.reason}`
          )
          
          return {
            allowed: false,
            response: new Response(JSON.stringify({ 
              error: 'Too many requests',
              reason: ddosCheck.reason 
            }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
      }

      // Rate Limiting
      const rateLimitResult = await rateLimiter.checkRateLimit(
        clientIP, 'ip', endpoint, options.rateLimitConfig
      )

      if (!rateLimitResult.allowed) {
        await apiMonitor.recordAPICall(
          endpoint, req.method, Date.now() - startTime, 429,
          undefined, undefined, 'Rate limit exceeded'
        )
        
        return {
          allowed: false,
          response: new Response(JSON.stringify({ 
            error: 'Rate limit exceeded',
            resetTime: rateLimitResult.resetTime.toISOString()
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': options.rateLimitConfig?.maxRequests.toString() || '60',
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.getTime().toString()
            }
          })
        }
      }

      // Custom validation
      if (options.customValidation) {
        const isValid = await options.customValidation(req)
        if (!isValid) {
          await apiMonitor.recordAPICall(
            endpoint, req.method, Date.now() - startTime, 400,
            undefined, undefined, 'Custom validation failed'
          )
          
          return {
            allowed: false,
            response: new Response(JSON.stringify({ error: 'Invalid request' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
      }

      return {
        allowed: true,
        headers: {
          ...SECURITY_HEADERS,
          'X-RateLimit-Limit': options.rateLimitConfig?.maxRequests.toString() || '60',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.getTime().toString()
        }
      }
    } catch (error) {
      console.error('Security middleware error:', error)
      await apiMonitor.recordAPICall(
        endpoint, req.method, Date.now() - startTime, 500,
        undefined, undefined, `Security middleware error: ${error}`
      )
      
      // Fail open for security middleware errors
      return { allowed: true }
    }
  }
}
