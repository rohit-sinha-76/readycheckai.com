/**
 * Assessment Runner Page
 * Runs the actual assessment with questions from session
 * Fetches real data from API and uses AssessmentEngine component
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Shield, Target, Cpu, Zap, ShieldCheck, LayoutGrid, Sparkles, Brain } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { AssessmentEngine } from '@/features/assessment/components/AssessmentEngine'
import { finalizeAssessment } from '@/features/assessment/actions'
import type { AssessmentSession, SanitizedQuestion, CertificationLevelCode } from '@/types'

interface SessionData {
  sessionId: string
  level: string
  mode: 'practice' | 'certification'
  questions: Array<{
    key: string
    text: string
    format: string
    options: Array<{ id?: string; text: string }>
    points: number
    timeRecommended?: number
  }>
  totalQuestions: number
  expiresAt: string
  overallSeconds: number
  perQuestionSeconds: number
}

const LEVEL_INFO = {
  rcaf: { name: 'AI Foundations', icon: Cpu, color: 'bg-blue-500 text-white' },
  rcap: { name: 'AI Practitioner', icon: Zap, color: 'bg-green-500 text-white' },
  rcgs: { name: 'GenAI Specialist', icon: ShieldCheck, color: 'bg-purple-500 text-white' },
  rcsa: { name: 'AI Solutions Architect', icon: LayoutGrid, color: 'bg-orange-500 text-white' }
}

export default function AssessmentRunnerPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [assessmentSession, setAssessmentSession] = useState<AssessmentSession | null>(null)
  const [questions, setQuestions] = useState<SanitizedQuestion[]>([])
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    loadSessionData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      console.log('[Runner Page] Loading session data for:', sessionId)
      setLoading(true)
      setError(null)

      // Note: The /api/assessment/v2/start endpoint returns session data
      // We need to fetch from localStorage or create a session fetch endpoint
      // For now, we'll check if session data was stored after start
      const storedSession = sessionStorage.getItem(`assessment_${sessionId}`)

      console.log('[Runner Page] SessionStorage data:', storedSession ? 'Found' : 'Not found')

      if (storedSession) {
        const data: SessionData = JSON.parse(storedSession)
        setSessionData(data)

        // Transform to AssessmentEngine format
        const session: AssessmentSession = {
          id: data.sessionId,
          userId: '', // Will be filled by API
          token: data.sessionId,
          fingerprint: '',
          assessmentType: data.mode,
          certificationLevel: data.level as CertificationLevelCode,
          status: 'in_progress',
          totalQuestions: data.totalQuestions,
          timeLimitMinutes: Math.floor(data.overallSeconds / 60),
          timeSpentSeconds: 0,
          currentQuestionIndex: 0,
          questionsAnswered: 0,
          honorCodeAccepted: data.mode === 'certification',
          violations: [],
          startedAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
          metadata: {
            userAgent: navigator.userAgent,
            ipAddress: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            autoSaveEnabled: true
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedQuestions: SanitizedQuestion[] = data.questions.map((q: any) => ({
          id: q.key,
          questionKey: q.key,
          questionText: q.text,
          questionFormat: (q.format === 'single_choice' ? 'multiple_choice' : q.format) as 'multiple_choice' | 'multiple_select' | 'true_false',
          difficulty: 'intermediate',
          categoryId: 'general',
          tags: [],
          timeAllocationSeconds: q.timeRecommended || data.perQuestionSeconds,
          points: q.points,
          complexityScore: 3,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options: q.options?.map((opt: any, optIdx: number) => {
            // Handle both string and object formats
            if (typeof opt === 'string') {
              // API returns plain string
              return {
                id: `option_${optIdx}`,
                text: opt,
                order: optIdx
              }
            } else {
              // API returns object
              return {
                id: opt.id || opt.option_id || `option_${optIdx}`,
                text: opt.text || opt.option_text || opt.content || '',
                order: optIdx
              }
            }
          }) || [],
          metadata: {
            authorId: '',
            version: 1,
            usageCount: 0,
            averageScore: 0,
            averageTimeSpent: 0
          }
        }))

        setAssessmentSession(session)
        setQuestions(transformedQuestions)
        setLoading(false)
      } else {
        // Session not found in storage, redirect back to start
        throw new Error('Session data not found. Please start a new assessment.')
      }

    } catch (err) {
      console.error('Error loading session:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assessment session'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      setLoading(false)

      // Redirect to start after showing error
      setTimeout(() => {
        router.push('/assess/start')
      }, 3000)
    }
  }

  const handleComplete = async () => {
    // Prevent double-submission
    if (isCompleting) {
      console.log('[Finalize] Already in progress, ignoring duplicate submission')
      return
    }

    try {
      setIsCompleting(true)
      console.log('[Finalize] Starting finalization:', { sessionId: sessionId })

      let data
      try {
        data = await finalizeAssessment({ sessionId })
      } catch (err: any) {
        if (err?.message?.includes('already completed') || err?.code === 'ALREADY_COMPLETED') {
          console.log('[Finalize] Session already completed, redirecting to results')
          sessionStorage.removeItem(`assessment_${sessionId}`)
          router.push(`/assess/${sessionId}/results`)
          return
        }
        throw err
      }
      console.log('[Finalize] Success data:', data)

      // Clear session storage
      sessionStorage.removeItem(`assessment_${sessionId}`)

      toast({
        title: 'Assessment Complete!',
        description: `Your score: ${data.score}%`
      })

      // Navigate to results
      router.push(`/assess/${sessionId}/results`)

    } catch (error) {
      console.error('[Finalize] Complete error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to finalize assessment'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      setIsCompleting(false)
    }
  }

  const handleError = (errorMessage: string) => {
    toast({
      title: 'Assessment Error',
      description: errorMessage,
      variant: 'destructive'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium mb-2">Starting Your Assessment</p>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we prepare your questions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !assessmentSession || !questions.length) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Assessment Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {error || 'Session not found or expired. Please start a new assessment.'}
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/assess/start')} className="flex-1">
                <Target className="h-4 w-4 mr-2" />
                Start New Assessment
              </Button>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rawLevel = sessionData!.level

  // Support both certification levels and special/free tracks
  const levelInfo =
    LEVEL_INFO[rawLevel as keyof typeof LEVEL_INFO] ||
    (rawLevel === 'genai_free'
      ? { name: 'AI Readiness Check', icon: Sparkles, color: 'bg-indigo-500 text-white' }
      : { name: 'Assessment', icon: Brain, color: 'bg-slate-500 text-white' })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto py-3 sm:py-4 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${levelInfo.color}`}>
                <levelInfo.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold break-words">
                  {levelInfo.name} {sessionData!.mode === 'certification' ? 'Certification' : 'Practice'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {sessionData!.totalQuestions} questions • {Math.floor(sessionData!.overallSeconds / 60)} minutes
                </p>
              </div>
            </div>
            {sessionData!.mode === 'certification' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg text-xs sm:text-sm self-start sm:self-auto">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Honor Code Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Engine */}
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
        <AssessmentEngine
          session={assessmentSession}
          questions={questions}
          onComplete={handleComplete}
          onError={handleError}
        />
      </div>
    </div>
  )
}
