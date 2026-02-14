import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createErrorResponse, createSuccessResponse } from '@/features/auth/actions'
import { z } from 'zod'

const verifyCertificateSchema = z.object({
  certificate_code: z.string().min(1)
})

// Rate limiting for public verification
const verificationRateLimit = new Map<string, { count: number; resetTime: number }>()

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for public endpoint
    const clientIp = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute
    const maxRequests = 10 // per minute for verification

    const current = verificationRateLimit.get(clientIp)

    if (!current || now > current.resetTime) {
      verificationRateLimit.set(clientIp, { count: 1, resetTime: now + windowMs })
    } else {
      if (current.count >= maxRequests) {
        return createErrorResponse('Rate limit exceeded for certificate verification', 429)
      }
      current.count++
      verificationRateLimit.set(clientIp, current)
    }

    // Parse and validate request body
    const body = await request.json()
    const { certificate_code } = verifyCertificateSchema.parse(body)

    // Create Supabase client (no auth required for public verification)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined }
        },
      }
    )

    // Verify certificate
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        certificate_code,
        certification_level,
        user_full_name,
        final_score,
        passed_at,
        status,
        expires_at,
        certification_levels!inner(
          level_name,
          description
        )
      `)
      .eq('certificate_code', certificate_code)
      .eq('status', 'active')
      .single()

    if (error || !certificate) {
      return createErrorResponse('Certificate not found or invalid', 404)
    }

    // Check if certificate is expired
    if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
      return createErrorResponse('Certificate has expired', 400)
    }

    // Return public certificate information (no sensitive data)
    return createSuccessResponse({
      valid: true,
      verified: true,
      certificate: {
        code: certificate.certificate_code,
        holder_name: certificate.user_full_name,
        certification_level: certificate.certification_level,
        level_name: certificate.certification_levels[0]?.level_name,
        level_description: certificate.certification_levels[0]?.description,
        score: certificate.final_score,
        issued_date: certificate.passed_at,
        status: certificate.status,
        expires_at: certificate.expires_at
      }
    })


  } catch (error) {
    console.error('Certificate verification error:', error)

    if (error instanceof z.ZodError) {
      return createErrorResponse(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400)
    }

    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get certificate by code via query parameter
    const { searchParams } = new URL(request.url)
    const certificateCode = searchParams.get('code')

    if (!certificateCode) {
      return createErrorResponse('Certificate code required', 400)
    }

    // Rate limiting
    const clientIp = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowMs = 60 * 1000
    const maxRequests = 10

    const current = verificationRateLimit.get(clientIp)

    if (!current || now > current.resetTime) {
      verificationRateLimit.set(clientIp, { count: 1, resetTime: now + windowMs })
    } else {
      if (current.count >= maxRequests) {
        return createErrorResponse('Rate limit exceeded', 429)
      }
      current.count++
      verificationRateLimit.set(clientIp, current)
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined }
        },
      }
    )

    // Verify certificate
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        certificate_code,
        certification_level,
        user_full_name,
        final_score,
        passed_at,
        status,
        expires_at,
        verification_hash,
        certification_levels!inner(
          level_name,
          description
        )
      `)
      .eq('certificate_code', certificateCode)
      .eq('status', 'active')
      .single()

    if (error || !certificate) {
      return createErrorResponse('Certificate not found or invalid', 404)
    }

    // Check if certificate is expired
    if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
      return createErrorResponse('Certificate has expired', 400)
    }

    // Verify hash integrity
    const expectedHash = Buffer.from(`${certificate.certificate_code}-${certificate.final_score}`).toString('base64')
    const hashValid = certificate.verification_hash === expectedHash

    return createSuccessResponse({
      valid: true,
      verified: hashValid,
      certificate: {
        code: certificate.certificate_code,
        holder_name: certificate.user_full_name,
        certification_level: certificate.certification_level,
        level_name: certificate.certification_levels[0]?.level_name,
        level_description: certificate.certification_levels[0]?.description,
        score: certificate.final_score,
        issued_date: certificate.passed_at,
        status: certificate.status,
        expires_at: certificate.expires_at
      }
    })

  } catch (error) {
    console.error('Certificate GET verification error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
