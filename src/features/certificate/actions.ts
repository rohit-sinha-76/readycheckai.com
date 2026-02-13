/**
 * ReadyCheck AI - Certificate Verification System
 * Phase 6: Digital signatures, verification API, and certificate management
 */

import { createClient } from '@supabase/supabase-js'
import { createHash, createSign, createVerify } from 'crypto'
// import type { Database } from '@/types/supabase'  // TODO: Fix database type exports

// ============================================================================
// CERTIFICATE VERIFICATION CLIENT
// ============================================================================

export class CertificateVerificationClient {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ============================================================================
  // DIGITAL SIGNATURE MANAGEMENT
  // ============================================================================

  private generateDigitalSignature(certificateData: {
    userId: string
    certificationLevel: string
    score: number
    passedAt: string
    sessionId: string
  }): string {
    // SECURITY: Private key MUST be provided via environment variable
    const privateKey = process.env.CERTIFICATE_PRIVATE_KEY
    
    if (!privateKey) {
      throw new Error('CERTIFICATE_PRIVATE_KEY environment variable is required for certificate signing')
    }

    const dataToSign = JSON.stringify({
      userId: certificateData.userId,
      certificationLevel: certificateData.certificationLevel,
      score: certificateData.score,
      passedAt: certificateData.passedAt,
      sessionId: certificateData.sessionId,
      timestamp: new Date().toISOString()
    })

    try {
      const sign = createSign('RSA-SHA256')
      sign.update(dataToSign)
      return sign.sign(privateKey, 'base64')
    } catch (error) {
      console.error('Failed to generate digital signature:', error)
      // Fallback to hash-based signature
      return createHash('sha256').update(dataToSign).digest('hex')
    }
  }

  private verifyDigitalSignature(
    certificateData: {
      userId: string
      certificationLevel: string
      score: number
      passedAt: string
      sessionId: string
      timestamp: string
    },
    signature: string
  ): boolean {
    // SECURITY: Public key MUST be provided via environment variable
    const publicKey = process.env.CERTIFICATE_PUBLIC_KEY
    
    if (!publicKey) {
      throw new Error('CERTIFICATE_PUBLIC_KEY environment variable is required for certificate verification')
    }

    const dataToVerify = JSON.stringify({
      userId: certificateData.userId,
      certificationLevel: certificateData.certificationLevel,
      score: certificateData.score,
      passedAt: certificateData.passedAt,
      sessionId: certificateData.sessionId,
      timestamp: certificateData.timestamp
    })

    try {
      const verify = createVerify('RSA-SHA256')
      verify.update(dataToVerify)
      return verify.verify(publicKey, signature, 'base64')
    } catch (error) {
      console.error('Failed to verify digital signature:', error)
      // Fallback to hash comparison
      const expectedHash = createHash('sha256').update(dataToVerify).digest('hex')
      return signature === expectedHash
    }
  }

  // ============================================================================
  // CERTIFICATE GENERATION
  // ============================================================================

  async generateCertificate(
    userId: string,
    certificationLevel: string,
    score: number,
    sessionId: string
  ): Promise<{
    certificateId: string
    verificationCode: string
    qrCodeUrl: string
    certificateUrl: string
  }> {
    try {
      const passedAt = new Date().toISOString()
      
      // Generate digital signature
      const digitalSignature = this.generateDigitalSignature({
        userId,
        certificationLevel,
        score,
        passedAt,
        sessionId
      })

      // Create certificate record
      const { data: certificate, error: certError } = await this.supabase
        .from('certificates')
        .insert({
          user_id: userId,
          certification_level: certificationLevel,
          score,
          passed_at: passedAt,
          session_id: sessionId,
          expires_at: null, // Certificates don't expire by default
          metadata: {
            sessionId,
            timeSpent: 0, // Would be calculated from session data
            questionsAnswered: 0,
            honorCodeViolations: 0
          }
        })
        .select()
        .single()

      if (certError || !certificate) {
        throw new Error(`Failed to create certificate: ${certError?.message}`)
      }

      // Generate verification code and QR code
      const { data: verificationCode } = await this.supabase
        .rpc('generate_certificate_verification', {
          p_certificate_id: certificate.id,
          p_digital_signature: digitalSignature,
          p_public_key_id: 'readycheck_v1'
        })

      if (!verificationCode) {
        throw new Error('Failed to generate verification code')
      }

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        `https://readycheck.ai/verify/${verificationCode}`
      )}`

      const certificateUrl = `https://readycheck.ai/certificates/${certificate.id}`

      return {
        certificateId: certificate.id,
        verificationCode,
        qrCodeUrl,
        certificateUrl
      }
    } catch (error) {
      console.error('Failed to generate certificate:', error)
      throw error
    }
  }

  // ============================================================================
  // CERTIFICATE VERIFICATION
  // ============================================================================

  async verifyCertificate(
    verificationCode: string,
    accessorInfo?: {
      organizationName?: string
      verifierName?: string
      purpose?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<{
    isValid: boolean
    certificate?: {
      id: string
      holderName: string
      holderEmail: string
      certificationLevel: string
      levelName: string
      score: number
      passedAt: string
      expiresAt: string | null
      isRevoked: boolean
      organizationName?: string
    }
    error?: string
  }> {
    try {
      // Log verification attempt
      await this.supabase.from('certificate_access_log').insert({
        verification_code: verificationCode,
        accessor_ip: accessorInfo?.ipAddress,
        accessor_user_agent: accessorInfo?.userAgent,
        verification_method: 'api',
        verification_result: 'pending'
      })

      // Get certificate verification record
      const { data: verification, error: verifyError } = await this.supabase
        .from('certificate_verification')
        .select(`
          *,
          certificates!inner(
            id,
            user_id,
            certification_level,
            score,
            passed_at,
            expires_at,
            is_revoked,
            users!inner(
              full_name,
              email,
              company
            ),
            certification_levels!inner(
              name
            )
          )
        `)
        .eq('verification_code', verificationCode)
        .eq('is_revoked', false)
        .single()

      if (verifyError || !verification) {
        await this.updateVerificationLog(verificationCode, 'invalid')
        return {
          isValid: false,
          error: 'Certificate not found or invalid verification code'
        }
      }

      const certificate = verification.certificates

      // Check if certificate is revoked
      if (certificate.is_revoked) {
        await this.updateVerificationLog(verificationCode, 'revoked')
        return {
          isValid: false,
          error: 'Certificate has been revoked'
        }
      }

      // Check if certificate is expired
      if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
        await this.updateVerificationLog(verificationCode, 'expired')
        return {
          isValid: false,
          error: 'Certificate has expired'
        }
      }

      // Update verification count and last verified timestamp
      await this.supabase
        .from('certificate_verification')
        .update({
          verification_count: verification.verification_count + 1,
          last_verified_at: new Date().toISOString()
        })
        .eq('id', verification.id)

      await this.updateVerificationLog(verificationCode, 'valid')

      return {
        isValid: true,
        certificate: {
          id: certificate.id,
          holderName: certificate.users.full_name,
          holderEmail: certificate.users.email,
          certificationLevel: certificate.certification_level,
          levelName: certificate.certification_levels.name,
          score: certificate.score,
          passedAt: certificate.passed_at,
          expiresAt: certificate.expires_at,
          isRevoked: certificate.is_revoked,
          organizationName: certificate.users.company
        }
      }
    } catch (error) {
      console.error('Failed to verify certificate:', error)
      await this.updateVerificationLog(verificationCode, 'invalid')
      return {
        isValid: false,
        error: 'Verification failed due to system error'
      }
    }
  }

  private async updateVerificationLog(
    verificationCode: string,
    result: 'valid' | 'invalid' | 'revoked' | 'expired'
  ): Promise<void> {
    try {
      await this.supabase
        .from('certificate_access_log')
        .update({ verification_result: result })
        .eq('verification_code', verificationCode)
        .eq('verification_result', 'pending')
    } catch (error) {
      console.error('Failed to update verification log:', error)
    }
  }

  // ============================================================================
  // CERTIFICATE MANAGEMENT
  // ============================================================================

  async revokeCertificate(
    certificateId: string,
    reason: string,
    revokedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    void revokedBy
    try {
      const { error } = await this.supabase
        .from('certificates')
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason
        })
        .eq('id', certificateId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Also mark verification record as revoked
      await this.supabase
        .from('certificate_verification')
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason
        })
        .eq('certificate_id', certificateId)

      return { success: true }
    } catch (error) {
      console.error('Failed to revoke certificate:', error)
      return { success: false, error: 'Failed to revoke certificate' }
    }
  }

  async getCertificatesByUser(userId: string): Promise<Array<{
    id: string
    certificationLevel: string
    levelName: string
    score: number
    passedAt: string
    verificationCode: string
    qrCodeUrl: string
    isRevoked: boolean
  }>> {
    try {
      const { data: certificates } = await this.supabase
        .from('certificates')
        .select(`
          id,
          certification_level,
          score,
          passed_at,
          is_revoked,
          certification_levels!inner(name),
          certificate_verification!inner(
            verification_code,
            qr_code_url
          )
        `)
        .eq('user_id', userId)
        .order('passed_at', { ascending: false })
      type UserCertificateRow = {
        id: string
        certification_level: string
        score: number
        passed_at: string
        is_revoked: boolean
        certification_levels: { name: string } | null
        certificate_verification: { verification_code: string; qr_code_url: string } | null
      }

      const typedCertificates = (certificates ?? []) as unknown as UserCertificateRow[]

      return typedCertificates.map(cert => ({
        id: cert.id,
        certificationLevel: cert.certification_level,
        levelName: cert.certification_levels?.name || 'Unknown',
        score: cert.score,
        passedAt: cert.passed_at,
        verificationCode: cert.certificate_verification?.verification_code || '',
        qrCodeUrl: cert.certificate_verification?.qr_code_url || '',
        isRevoked: cert.is_revoked
      }))
    } catch (error) {
      console.error('Failed to get user certificates:', error)
      return []
    }
  }

  // ============================================================================
  // BULK CERTIFICATE OPERATIONS
  // ============================================================================

  async generateBulkCertificates(
    certificates: Array<{
      userId: string
      certificationLevel: string
      score: number
      sessionId: string
    }>
  ): Promise<{
    successful: number
    failed: number
    results: Array<{
      userId: string
      success: boolean
      certificateId?: string
      verificationCode?: string
      error?: string
    }>
  }> {
    const results = []
    let successful = 0
    let failed = 0

    for (const cert of certificates) {
      try {
        const result = await this.generateCertificate(
          cert.userId,
          cert.certificationLevel,
          cert.score,
          cert.sessionId
        )

        results.push({
          userId: cert.userId,
          success: true,
          certificateId: result.certificateId,
          verificationCode: result.verificationCode
        })
        successful++
      } catch (error) {
        results.push({
          userId: cert.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }
    }

    return { successful, failed, results }
  }

  // ============================================================================
  // CERTIFICATE ANALYTICS
  // ============================================================================

  async getCertificateAnalytics(timeRange?: { start: Date; end: Date }): Promise<{
    totalCertificates: number
    certificatesByLevel: Record<string, number>
    verificationCount: number
    revocationRate: number
    averageScore: number
    topPerformers: Array<{
      userId: string
      userName: string
      certificateCount: number
      averageScore: number
    }>
  }> {
    try {
      let query = this.supabase
        .from('certificates')
        .select(`
          certification_level,
          score,
          is_revoked,
          user_id,
          users!inner(full_name),
          certificate_verification!inner(verification_count)
        `)

      if (timeRange) {
        query = query
          .gte('passed_at', timeRange.start.toISOString())
          .lte('passed_at', timeRange.end.toISOString())
      }

      const { data: certificates } = await query

      if (!certificates || certificates.length === 0) {
        return {
          totalCertificates: 0,
          certificatesByLevel: {},
          verificationCount: 0,
          revocationRate: 0,
          averageScore: 0,
          topPerformers: []
        }
      }

      type CertificateAnalyticsRow = {
        certification_level: string
        score: number
        is_revoked: boolean
        user_id: string
        users: { full_name: string | null }
        certificate_verification: { verification_count: number } | null
      }

      const typedCertificates = (certificates ?? []) as unknown as CertificateAnalyticsRow[]

      const totalCertificates = typedCertificates.length
      const revokedCount = typedCertificates.filter(c => c.is_revoked).length
      const revocationRate = revokedCount / totalCertificates

      const certificatesByLevel = typedCertificates.reduce((acc, cert) => {
        acc[cert.certification_level] = (acc[cert.certification_level] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const totalVerifications = typedCertificates.reduce((sum, cert) => 
        sum + (cert.certificate_verification?.verification_count || 0), 0
      )

      const averageScore = typedCertificates.reduce((sum, cert) => sum + cert.score, 0) / totalCertificates

      // Calculate top performers
      type UserPerformance = {
        userName: string
        certificates: CertificateAnalyticsRow[]
        totalScore: number
      }

      const userPerformance = typedCertificates.reduce((acc, cert) => {
        const userId = cert.user_id
        if (!acc[userId]) {
          acc[userId] = {
            userName: cert.users.full_name || 'Unknown User',
            certificates: [],
            totalScore: 0
          }
        }
        acc[userId].certificates.push(cert)
        acc[userId].totalScore += cert.score
        return acc
      }, {} as Record<string, UserPerformance>)

      const topPerformers = Object.entries(userPerformance)
        .map(([userId, data]) => ({
          userId,
          userName: data.userName,
          certificateCount: data.certificates.length,
          averageScore: data.totalScore / data.certificates.length
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 10)

      return {
        totalCertificates,
        certificatesByLevel,
        verificationCount: totalVerifications,
        revocationRate,
        averageScore,
        topPerformers
      }
    } catch (error) {
      console.error('Failed to get certificate analytics:', error)
      return {
        totalCertificates: 0,
        certificatesByLevel: {},
        verificationCount: 0,
        revocationRate: 0,
        averageScore: 0,
        topPerformers: []
      }
    }
  }
}

// Export singleton instance
export const certificateVerification = new CertificateVerificationClient()
