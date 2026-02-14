'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Award,
  Download,
  Share2,
  CheckCircle,
  Calendar,
  Hash,
  Shield,
  Linkedin,
  Copy,
  Check,
  Briefcase
} from 'lucide-react'

// Certificate data interface
interface CertificateData {
  code: string
  holder_name: string
  certification_level: string
  level_name: string
  level_description: string
  score: number
  issued_date: string
  status: string
  expires_at?: string
}

// Certification level details with full names and skills
const CERTIFICATION_INFO: Record<string, {
  fullName: string
  skills: string[]
  description: string
  gradient: string
  badge: string
  accent: string
}> = {
  rcaf: {
    fullName: 'ReadyCheck AI Foundations',
    skills: [
      'AI Fundamentals & Core Concepts',
      'Machine Learning Basics',
      'AI Ethics & Best Practices',
      'Prompt Engineering',
      'AI Tool Utilization'
    ],
    description: 'Demonstrates foundational knowledge in artificial intelligence concepts and practical application of AI tools in professional environments.',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-500',
    accent: 'text-emerald-600'
  },
  rcap: {
    fullName: 'ReadyCheck AI Practitioner',
    skills: [
      'Advanced AI Implementation',
      'AI Workflow Integration',
      'Data Analysis with AI',
      'AI-Driven Decision Making',
      'Cross-functional AI Collaboration'
    ],
    description: 'Validates advanced proficiency in implementing AI solutions and integrating AI tools into business workflows.',
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-500',
    accent: 'text-blue-600'
  },
  rcgs: {
    fullName: 'ReadyCheck GenAI Specialist',
    skills: [
      'Generative AI Mastery',
      'Large Language Models (LLMs)',
      'AI Content Generation',
      'Advanced Prompt Engineering',
      'GenAI Application Development'
    ],
    description: 'Certifies expertise in generative AI technologies and their application in creating innovative AI-powered solutions.',
    gradient: 'from-purple-500 to-violet-600',
    badge: 'bg-purple-500',
    accent: 'text-purple-600'
  },
  rcas: {
    fullName: 'ReadyCheck AI Solutions Architect',
    skills: [
      'Enterprise AI Architecture',
      'AI Solution Design',
      'AI Strategy & Governance',
      'Scalable AI Systems',
      'AI ROI & Business Impact'
    ],
    description: 'Demonstrates expertise in designing and architecting enterprise-level AI solutions with focus on scalability and business value.',
    gradient: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-500',
    accent: 'text-amber-600'
  }
}

export default function CertificateDisplayPage() {
  const params = useParams()
  const certificateCode = params.code as string
  const certificateRef = useRef<HTMLDivElement>(null)

  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (certificateCode) {
      fetchCertificate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateCode])

  const fetchCertificate = async () => {
    try {
      const response = await fetch(`/api/certification/verify?code=${encodeURIComponent(certificateCode)}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Certificate not found or has been revoked')
        }
        throw new Error('Failed to verify certificate')
      }

      const data = await response.json()
      setCertificate(data.certificate)
    } catch (err) {
      console.error('Certificate fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load certificate')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCertInfo = (level: string) => {
    return CERTIFICATION_INFO[level?.toLowerCase()] || CERTIFICATION_INFO.rcaf
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLinkedInShare = () => {
    if (!certificate) return
    const certInfo = getCertInfo(certificate.certification_level)
    const text = `I'm proud to have earned the ${certInfo.fullName} certification from ReadyCheck AI! Verify: ${window.location.href}`
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(text)}`
    window.open(linkedInUrl, '_blank', 'width=600,height=400')
  }

  const handleShare = async () => {
    if (!certificate) return
    const certInfo = getCertInfo(certificate.certification_level)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${certificate.holder_name} - ${certInfo.fullName}`,
          text: `ReadyCheck AI Certification`,
          url: window.location.href
        })
      } catch {
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleDownloadPDF = async () => {
    if (!certificateRef.current || downloading || !certificate) return

    setDownloading(true)

    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])

      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule

      // Capture certificate at high resolution
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3, // 3x resolution for crisp printing
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure QR code images load properly
          const qrImg = clonedDoc.querySelector('.qr-code-img') as HTMLImageElement
          if (qrImg) {
            qrImg.crossOrigin = 'anonymous'
          }
        }
      })

      // A4 Landscape: 297mm x 210mm (11.69 x 8.27 inches)
      // This is the international standard used by Coursera and professional certifications
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4' // A4 = 297mm x 210mm in landscape
      })

      const imgData = canvas.toDataURL('image/png', 1.0)

      // PDF dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth() // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 210mm

      // Canvas dimensions
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Calculate scaling to fit certificate perfectly on page with small margins
      const margin = 5 // 5mm margin on all sides
      const availableWidth = pdfWidth - (margin * 2)
      const availableHeight = pdfHeight - (margin * 2)

      const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight)

      const finalWidth = imgWidth * ratio
      const finalHeight = imgHeight * ratio

      // Center the certificate on the page
      const x = (pdfWidth - finalWidth) / 2
      const y = (pdfHeight - finalHeight) / 2

      // Add certificate image to PDF
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST')

      // Save with professional filename
      const certInfo = getCertInfo(certificate.certification_level)
      const fileName = `${certificate.holder_name.replace(/\s+/g, '_')}-${certInfo.fullName.replace(/\s+/g, '_')}-${certificate.code}.pdf`
      pdf.save(fileName)

    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying certificate...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">Certificate Not Found</h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error || 'The certificate code is invalid or the certificate has been revoked.'}
          </p>
          <p className="text-sm text-red-500 font-mono">
            Code: {certificateCode}
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => window.location.href = '/verify'}
          >
            Try Another Code
          </Button>
        </Card>
      </div>
    )
  }

  const certInfo = getCertInfo(certificate.certification_level)

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {/* Verification Badge - Top Banner */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full py-2 px-6 w-fit mx-auto">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-400 font-medium">Verified Credential</span>
        </div>
      </div>

      {/* Main Certificate */}
      <div className="max-w-6xl mx-auto">
        <div
          ref={certificateRef}
          className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
          style={{ aspectRatio: '1.414 / 1' }} // Landscape A4 ratio
        >
          {/* Top gradient bar */}
          <div className={`h-2 bg-gradient-to-r ${certInfo.gradient}`}></div>

          {/* Certificate Content */}
          <div className="p-8 md:p-12">
            {/* Header - Logo and Branding */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${certInfo.gradient} flex items-center justify-center shadow-lg`}>
                  <Award className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ReadyCheck AI</h1>
                  <p className="text-xs text-gray-600">Professional AI Certification</p>
                </div>
              </div>
              <Badge className={`${certInfo.badge} text-white px-4 py-1.5 text-xs font-semibold`}>
                VERIFIED
              </Badge>
            </div>

            {/* Main Content - Landscape Layout */}
            <div className="grid grid-cols-3 gap-8 mb-8">
              {/* Left Column - Certificate Info */}
              <div className="col-span-2 space-y-6">
                {/* Certificate Title */}
                <div>
                  <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">
                    Certificate of Professional Achievement
                  </p>
                  <h2 className="text-4xl font-serif font-bold text-gray-900 mb-3">
                    {certificate.holder_name}
                  </h2>
                  <p className="text-gray-600 text-base mb-3">
                    has successfully demonstrated expertise in
                  </p>

                  {/* Certification Level */}
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 mb-4">
                    <h3 className={`text-2xl font-bold ${certInfo.accent} mb-2`}>
                      {certInfo.fullName}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {certInfo.description}
                    </p>
                  </div>
                </div>

                {/* Skills Grid - Compact */}
                <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-gray-600" />
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Core Competencies Validated
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {certInfo.skills.slice(0, 4).map((skill, index) => (
                      <div key={index} className="flex items-start gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-xs leading-tight">{skill}</span>
                      </div>
                    ))}
                  </div>
                  {certInfo.skills.length > 4 && (
                    <p className="text-xs text-gray-500 mt-2">+{certInfo.skills.length - 4} more skills</p>
                  )}
                </div>

                {/* Score */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Assessment Score</p>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold text-blue-600">{certificate.score}%</div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <span className="text-green-700 font-semibold text-sm">Passed</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div className="text-left">
                          <p className="text-xs text-gray-500">Issue Date</p>
                          <p className="font-semibold text-gray-900 text-xs">{formatDate(certificate.issued_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <div className="text-left">
                          <p className="text-xs text-gray-500">Status</p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <p className="font-semibold text-gray-900 text-xs capitalize">{certificate.status}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - QR and Signature */}
              <div className="space-y-6 flex flex-col justify-between">
                {/* QR Code */}
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Instant Verification</p>
                  <div className="inline-block bg-white p-3 rounded-lg border-2 border-gray-300 shadow-sm mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`https://readycheck.ai/verify/${certificate.code}`)}&margin=0`}
                      alt="Verification QR Code"
                      className="w-32 h-32 qr-code-img"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Scan to verify</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Hash className="h-3 w-3 text-gray-500" />
                    <p className="font-mono font-semibold text-gray-900 text-xs">{certificate.code}</p>
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="text-center border-t-2 border-gray-300 pt-4">
                  <div className="h-12 mb-2 flex items-end justify-center">
                    <span className="font-serif italic text-2xl text-gray-400">ReadyCheck AI</span>
                  </div>
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="font-bold text-gray-900 text-sm">Certification Authority</p>
                    <p className="text-xs text-gray-600">ReadyCheck AI Platform</p>
                    <p className="text-xs text-gray-500 mt-1">Digitally Signed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - License Key */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">
                Verify this certificate at{' '}
                <a href="/verify" className="text-blue-600 hover:underline font-medium">
                  readycheck.ai/verify
                </a>
              </p>
              <p className="text-xs text-gray-400">
                Certificate ID: {certificate.code} • Issued: {formatDate(certificate.issued_date)}
              </p>
            </div>
          </div>

          {/* Bottom gradient bar */}
          <div className={`h-2 bg-gradient-to-r ${certInfo.gradient}`}></div>
        </div>

        {/* Action Buttons - Outside certificate for PDF */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className={`bg-gradient-to-r ${certInfo.gradient} hover:opacity-90 text-white px-6 py-3 text-base`}
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </>
            )}
          </Button>

          <Button onClick={handleLinkedInShare} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 px-6 py-3 text-base">
            <Linkedin className="w-5 h-5 mr-2" />
            Share on LinkedIn
          </Button>

          <Button onClick={handleShare} variant="outline" className="px-6 py-3 text-base">
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>

          <Button onClick={handleCopyLink} variant="outline" className="px-6 py-3 text-base">
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* Footer Info */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            This certificate can be verified at any time by entering the license key at{' '}
            <a href="/verify" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              readycheck.ai/verify
            </a>
          </p>
          <p className="text-xs text-muted-foreground/70">
            Certificate ID: {certificate.code} • Issued: {formatDate(certificate.issued_date)}
          </p>
        </div>
      </div>
    </div>
  )
}
