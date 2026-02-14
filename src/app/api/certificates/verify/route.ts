import { NextRequest, NextResponse } from 'next/server'
import { createSecurityMiddleware, ValidationSchemas } from '@/lib/security'
import { certificateVerification } from '@/features/certificate/actions'


// Security middleware configuration
const securityMiddleware = createSecurityMiddleware({
  rateLimitConfig: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 verifications per minute
  enableDDoSProtection: true,
  enableCSRFProtection: false, // Public API
  customValidation: async (req: NextRequest) => {
    try {
      const body = await req.json()
      ValidationSchemas.certificateVerification.parse(body)
      return true
    } catch {
      return false
    }
  }
})

export async function POST(req: NextRequest) {

  try {
    // Apply security middleware
    const securityResult = await securityMiddleware(req, '/api/certificates/verify')
    if (!securityResult.allowed) {
      return securityResult.response!
    }

    const body = await req.json()
    const { verificationCode, accessorInfo } = body

    // Get client information for logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Verify certificate
    const result = await certificateVerification.verifyCertificate(
      verificationCode,
      {
        ...accessorInfo,
        ipAddress: clientIP,
        userAgent: userAgent
      }
    )

    // Track analytics event
    /* if (result.isValid && result.certificate) {
      await analytics.trackUserEvent(
        result.certificate.id, // Use certificate ID as user identifier for public verifications
        'certificate_earned',
        {
          verificationCode,
          certificationLevel: result.certificate.certificationLevel,
          verifierInfo: accessorInfo
        },
        undefined, // No session for public verification
        clientIP,
      )
    } */

    // Record API performance (TODO: Implement)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Certificate verification API error:', error)

    return NextResponse.json(
      { error: 'Internal server error', isValid: false },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code required' },
        { status: 400 }
      )
    }

    const result = await certificateVerification.verifyCertificate(code)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Certificate verification GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', isValid: false },
      { status: 500 }
    )
  }
}
