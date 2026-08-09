import { describe, it, expect } from 'vitest'
import {
  sanitizeInput,
  validateCSRFToken,
  SECURITY_HEADERS,
  ValidationSchemas,
  DDoSProtection,
  getClientIP,
  getUserAgent
} from '@/lib/security'
import { NextRequest } from 'next/server'

describe('Security Utilities - src/lib/security.ts', () => {
  describe('Input Sanitization', () => {
    it('should strip script tags from malicious strings', () => {
      const malicious = 'Hello <script>alert("xss")</script> World'
      const clean = sanitizeInput(malicious)
      expect(clean).toBe('Hello  World')
      expect(clean).not.toContain('<script>')
    })

    it('should strip javascript: protocol prefixes', () => {
      const malicious = 'javascript:alert(1)'
      const clean = sanitizeInput(malicious)
      expect(clean).not.toContain('javascript:')
    })

    it('should strip inline HTML event handlers (onload, onerror)', () => {
      const malicious = '<img src="x" onerror="alert(1)" />'
      const clean = sanitizeInput(malicious)
      expect(clean).not.toContain('onerror=')
    })
  })

  describe('CSRF Validation', () => {
    it('should validate exact matching CSRF token header', () => {
      const req = new NextRequest('https://example.com/api', {
        headers: { 'x-csrf-token': 'token-123' }
      })
      expect(validateCSRFToken(req, 'token-123')).toBe(true)
      expect(validateCSRFToken(req, 'wrong-token')).toBe(false)
    })

    it('should allow XMLHttpRequest standard header', () => {
      const req = new NextRequest('https://example.com/api', {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
      })
      expect(validateCSRFToken(req, 'any-token')).toBe(true)
    })
  })

  describe('Security Headers', () => {
    it('should include required OWASP security headers', () => {
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block')
    })
  })

  describe('DDoS Protection', () => {
    it('should flag suspicious automated user agents', () => {
      expect(DDoSProtection.isSuspiciousUserAgent('curl/7.68.0')).toBe(true)
      expect(DDoSProtection.isSuspiciousUserAgent('python-requests/2.25.1')).toBe(true)
      expect(DDoSProtection.isSuspiciousUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false)
    })
  })

  describe('Client IP Extraction', () => {
    it('should prioritize cf-connecting-ip header', () => {
      const req = new NextRequest('https://example.com/api', {
        headers: {
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2'
        }
      })
      expect(getClientIP(req)).toBe('1.1.1.1')
    })

    it('should extract first IP from x-forwarded-for list', () => {
      const req = new NextRequest('https://example.com/api', {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178'
        }
      })
      expect(getClientIP(req)).toBe('203.0.113.195')
    })
  })

  describe('Validation Schemas', () => {
    it('should validate standard user login schema', () => {
      const valid = ValidationSchemas.userLogin.safeParse({
        email: 'user@example.com',
        password: 'ValidPassword123!'
      })
      expect(valid.success).toBe(true)

      const invalid = ValidationSchemas.userLogin.safeParse({
        email: 'invalid-email',
        password: ''
      })
      expect(invalid.success).toBe(false)
    })

    it('should validate assessment answer submission schema', () => {
      const valid = ValidationSchemas.assessmentAnswer.safeParse({
        questionId: '123e4567-e89b-12d3-a456-426614174000',
        selectedOptions: ['opt_1'],
        timeSpent: 45
      })
      expect(valid.success).toBe(true)
    })

    it('should validate user registration schema', () => {
      const valid = ValidationSchemas.userRegistration.safeParse({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'John Doe',
        company: 'Acme Corp'
      })
      expect(valid.success).toBe(true)

      const invalid = ValidationSchemas.userRegistration.safeParse({
        email: 'invalid-email',
        password: 'short',
        fullName: 'J'
      })
      expect(invalid.success).toBe(false)
    })

    it('should validate assessment start schema', () => {
      const valid = ValidationSchemas.assessmentStart.safeParse({
        assessmentType: 'certification',
        certificationLevel: 'RCAF',
        timeLimit: 1800
      })
      expect(valid.success).toBe(true)

      const invalid = ValidationSchemas.assessmentStart.safeParse({
        assessmentType: 'unknown_type'
      })
      expect(invalid.success).toBe(false)
    })

    it('should validate certificate verification schema', () => {
      const valid = ValidationSchemas.certificateVerification.safeParse({
        verificationCode: 'RC-ABCD1234-EFGH5678',
        accessorInfo: {
          organizationName: 'Verifier Inc',
          purpose: 'Employment check'
        }
      })
      expect(valid.success).toBe(true)

      const invalid = ValidationSchemas.certificateVerification.safeParse({
        verificationCode: 'invalid-code'
      })
      expect(invalid.success).toBe(false)
    })

    it('should validate payment order schema', () => {
      const valid = ValidationSchemas.paymentOrder.safeParse({
        planId: '123e4567-e89b-12d3-a456-426614174000',
        currency: 'INR',
        amount: 29900,
        customerInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com'
        }
      })
      expect(valid.success).toBe(true)

      const invalid = ValidationSchemas.paymentOrder.safeParse({
        planId: 'invalid-uuid',
        currency: 'EUR',
        amount: 0,
        customerInfo: {
          name: '',
          email: 'not-an-email'
        }
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('Client IP Extraction - Extended Branches', () => {
    it('should extract x-real-ip when cf-connecting-ip is absent', () => {
      const req = new NextRequest('https://example.com/api', {
        headers: {
          'x-real-ip': '192.168.1.100'
        }
      })
      expect(getClientIP(req)).toBe('192.168.1.100')
    })

    it('should fallback to unknown when no IP headers exist', () => {
      const req = new NextRequest('https://example.com/api')
      expect(getClientIP(req)).toBe('unknown')
    })
  })

  describe('DDoS Protection - Pattern Checks', () => {
    it('should detect various attack and scraper patterns', () => {
      expect(DDoSProtection.isSuspiciousUserAgent('Mozilla/5.0 Googlebot/2.1')).toBe(true)
      expect(DDoSProtection.isSuspiciousUserAgent('Wget/1.20.3 (linux-gnu)')).toBe(true)
      expect(DDoSProtection.isSuspiciousUserAgent('Go-http-client/1.1')).toBe(true)
      expect(DDoSProtection.isSuspiciousUserAgent('sql-inject-tool/1.0')).toBe(true)
      expect(DDoSProtection.isSuspiciousUserAgent('Java/1.8.0_202')).toBe(true)
    })
  })

  describe('User Agent Extraction', () => {
    it('should extract user-agent header or fallback', () => {
      const req = new NextRequest('https://example.com/api', {
        headers: { 'user-agent': 'CustomAgent/1.0' }
      })
      expect(getUserAgent(req)).toBe('CustomAgent/1.0')

      const reqNoAgent = new NextRequest('https://example.com/api')
      expect(getUserAgent(reqNoAgent)).toBe('unknown')
    })
  })

  describe('Proxy / Middleware Request Routing & Adapter', () => {
    it('should export proxy function and default adapterFn', async () => {
      const proxyModule = await import('@/proxy')
      expect(typeof proxyModule.proxy).toBe('function')
      expect(typeof proxyModule.default).toBe('function')
      expect(proxyModule.config).toBeDefined()
      expect(Array.isArray(proxyModule.config.matcher)).toBe(true)
    })

    it('should allow public root route without redirecting', async () => {
      const { proxy } = await import('@/proxy')
      const req = new NextRequest('https://readycheckai.com/')
      const res = await proxy(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    })

    it('should redirect unauthenticated protected route to login', async () => {
      const { proxy } = await import('@/proxy')
      const req = new NextRequest('https://readycheckai.com/dashboard')
      const res = await proxy(req)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/auth/login?redirect=%2Fdashboard')
    })
  })
})

