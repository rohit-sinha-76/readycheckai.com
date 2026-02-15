'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Shield, 
  Calendar, 
  User, 
  Building, 
  Award,
  Download,
  Share2,
  Clock,
  Cpu,
  Zap,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react'

interface CertificateData {
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

export default function CertificateVerificationPage() {
  const params = useParams()
  const verificationCode = params.code as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const verifyCertificate = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/certificates/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationCode,
          accessorInfo: {
            verifierName: 'Public Verification',
            purpose: 'Certificate validation'
          }
        })
      })

      const result = await response.json()

      if (result.isValid && result.certificate) {
        setIsValid(true)
        setCertificate(result.certificate)
      } else {
        setIsValid(false)
        setError(result.error || 'Certificate verification failed')
      }
    } catch (err: unknown) {
      setIsValid(false)
      setError('Failed to verify certificate. Please try again.')
      void err
    } finally {
      setIsLoading(false)
    }
  }, [verificationCode])

  useEffect(() => {
    if (verificationCode) {
      void verifyCertificate()
    }
  }, [verificationCode, verifyCertificate])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCertificationBadge = (level: string) => {
    const badges = {
      'RCAF': { color: 'bg-blue-100 text-blue-800', icon: Cpu },
      'RCAP': { color: 'bg-green-100 text-green-800', icon: Zap },
      'RCGS': { color: 'bg-purple-100 text-purple-800', icon: ShieldCheck },
      'RCSA': { color: 'bg-yellow-100 text-yellow-800', icon: LayoutGrid }
    }
    const badge = badges[level as keyof typeof badges] || badges['RCAF']
    const Icon = badge.icon
    return { ...badge, component: <Icon className="w-3 h-3 mr-1 inline" /> }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Verifying Certificate</h2>
            <p className="text-muted-foreground">Please wait while we validate the certificate...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Certificate Verification</h1>
            <p className="text-muted-foreground mt-2">
              Verification Code: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{verificationCode}</code>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {!isValid ? (
          /* Invalid Certificate */
          <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">Certificate Not Valid</h2>
              <p className="text-red-700 dark:text-red-400 mb-6">{error}</p>
              
              <div className="bg-background dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900/50 mb-6">
                <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">Possible Reasons:</h3>
                <ul className="text-sm text-red-700 dark:text-red-400 text-left space-y-1">
                  <li>• Invalid or expired verification code</li>
                  <li>• Certificate has been revoked</li>
                  <li>• Verification code was entered incorrectly</li>
                  <li>• Certificate does not exist in our system</li>
                </ul>
              </div>

              <Button onClick={verifyCertificate} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Valid Certificate */
          <div className="space-y-6">
            {/* Verification Status */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-green-800">Certificate Verified</h2>
                    <p className="text-green-700">This certificate is authentic and valid</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Details */}
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4">
                  <Shield className="w-16 h-16 text-primary-600" />
                </div>
                <CardTitle className="text-2xl">ReadyCheck AI Certification</CardTitle>
                <CardDescription>Official Certificate of Completion</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Certificate Holder */}
                <div className="text-center border-b pb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Certificate Holder</h3>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-lg font-medium">{certificate?.holderName}</span>
                  </div>
                  <p className="text-muted-foreground">{certificate?.holderEmail}</p>
                  {certificate?.organizationName && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{certificate.organizationName}</span>
                    </div>
                  )}
                </div>

                {/* Certification Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Certification Level</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getCertificationBadge(certificate?.certificationLevel || '').color}>
                          {getCertificationBadge(certificate?.certificationLevel || '').component}
                          {certificate?.certificationLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{certificate?.levelName}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Score Achieved</h4>
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-muted-foreground" />
                        <span className={`text-2xl font-bold ${getScoreColor(certificate?.score || 0)}`}>
                          {certificate?.score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Date Issued</h4>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span>{formatDate(certificate?.passedAt || '')}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Expiration</h4>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span>
                          {certificate?.expiresAt ? formatDate(certificate.expiresAt) : 'No expiration'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Verification Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Certificate ID:</span>
                      <span className="ml-2 font-mono">{certificate?.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verified:</span>
                      <span className="ml-2">{new Date().toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verification Code:</span>
                      <span className="ml-2 font-mono">{verificationCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-2 text-green-600 font-medium">Valid & Authentic</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Verification
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Security &amp; Authenticity</h4>
                    <p className="text-sm text-blue-700">
                      This certificate has been digitally signed and verified against ReadyCheck AI&apos;s secure database. 
                      The verification process ensures the authenticity and integrity of this certification.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About ReadyCheck AI */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About ReadyCheck AI Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  ReadyCheck AI provides comprehensive AI skills assessment and certification programs designed to validate 
                  practical AI knowledge and competencies in professional environments.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-semibold mb-2">Certification Levels:</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><Cpu className="w-4 h-4 inline mr-1"/> RCAF - AI Fundamentals</li>
                      <li><Zap className="w-4 h-4 inline mr-1"/> RCAP - AI Practitioner</li>
                      <li><ShieldCheck className="w-4 h-4 inline mr-1"/> RCGS - Governance Specialist</li>
                      <li><LayoutGrid className="w-4 h-4 inline mr-1"/> RCSA - Strategic Architect</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2">Recognition:</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Industry-recognized credentials</li>
                      <li>• Rigorous assessment standards</li>
                      <li>• Continuous validity monitoring</li>
                      <li>• Professional development tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
