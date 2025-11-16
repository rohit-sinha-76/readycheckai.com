/**
 * Assessment Results Page
 * Displays detailed results after assessment completion
 * Server Component - uses server-side data fetching
 * Security: Only shows results for completed sessions owned by authenticated user
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Award,
  Download,
  Share2,
  Clock,
  Target,
  TrendingUp,
  BookOpen,
  ArrowLeft,
  Trophy,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Cpu,
  Zap,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Assessment Results - ReadyCheck AI',
  description: 'View your assessment results and performance breakdown'
}

interface PageProps {
  params: Promise<{
    sessionId: string
  }>
}

// Helper function to format time
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

// Helper function to format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Certification level information
const LEVEL_INFO: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  rcaf: { name: 'AI Foundations', icon: Cpu, color: 'blue' },
  rcap: { name: 'AI Practitioner', icon: Zap, color: 'green' },
  rcgs: { name: 'GenAI Specialist', icon: ShieldCheck, color: 'purple' },
  rcsa: { name: 'AI Solutions Architect', icon: LayoutGrid, color: 'orange' }
}

// Server-side data fetching function
async function getAssessmentResults(sessionId: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Get session details with RLS protection (EXACT field names from schema)
  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id) // RLS: user can only see their own sessions
    .single()

  if (sessionError || !session) {
    console.error('[Results Page] Session fetch error:', sessionError)
    notFound()
  }

  // 3. Verify session is completed
  if (session.status !== 'completed') {
    console.error('[Results Page] Session not completed:', session.status)
    notFound()
  }

  // 4. Get certificate if applicable
  let certificate = null
  if (session.assessment_type === 'certification' && session.passed) {
    const { data: cert } = await supabase
      .from('certificates')
      .select('id, certificate_code, passed_at, expires_at')
      .eq('user_id', user.id)
      .eq('certification_level', session.certification_level)
      .eq('session_id', sessionId)
      .single()

    certificate = cert
  }

  // 5. Calculate category breakdown from questions_data and user_answers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionsData = (session.questions_data || []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userAnswers = (session.user_answers || {}) as Record<string, any>

  const categoryBreakdown: Record<string, { correct: number; total: number; points: number }> = {}
  let totalCorrect = 0
  let totalIncorrect = 0

  // Get question details for category breakdown
  if (questionsData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionKeys = questionsData.map((q: any) => q.question_key)
    const { data: questions } = await supabase
      .from('questions')
      .select('question_key, category_code_v2, correct_answer_index, correct_answer_id, points_base')
      .in('question_key', questionKeys)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions?.forEach((question: any) => {
      const category = question.category_code_v2 || 'General'
      const userAnswer = userAnswers[question.question_key]

      // Extract index from option ID (e.g., "option_2" => 2)
      const selectedIndex = userAnswer?.selected_option_id
        ? parseInt(userAnswer.selected_option_id.replace('option_', ''))
        : -1

      // Compare with correct_answer_index from database
      const isCorrect = selectedIndex === question.correct_answer_index

      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { correct: 0, total: 0, points: 0 }
      }

      categoryBreakdown[category].total++
      categoryBreakdown[category].points += question.points_base || 1

      if (isCorrect) {
        categoryBreakdown[category].correct++
        totalCorrect++
      } else if (userAnswer?.selected_option_id) {
        totalIncorrect++
      }
    })
  }

  return {
    session,
    certificate,
    categoryBreakdown,
    totalCorrect,
    totalIncorrect,
    totalUnanswered: session.total_questions - totalCorrect - totalIncorrect
  }
}

export default async function AssessmentResultsPage({ params }: PageProps) {
  const { sessionId } = await params
  // Fetch results server-side (secure, with RLS)
  const { session, certificate, categoryBreakdown, totalCorrect, totalIncorrect, totalUnanswered } = await getAssessmentResults(sessionId)

  const finalScore = session.final_score || 0
  const passed = session.passed || false
  const isCertification = session.assessment_type === 'certification'
  const levelInfo = session.certification_level ? LEVEL_INFO[session.certification_level] : null

  const accuracy = session.total_questions > 0 ? (totalCorrect / session.total_questions) * 100 : 0
  const completionRate = session.total_questions > 0 ? ((totalCorrect + totalIncorrect) / session.total_questions) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/assess/start">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {levelInfo && (
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <levelInfo.icon className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Assessment Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isCertification ? 'Certification' : 'Practice'} Assessment
                {levelInfo && ` • ${levelInfo.name}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Results Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Overview Card */}
            <Card className={`border-2 ${passed ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'}`}>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {passed ? (
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </div>

                <CardTitle className="text-5xl font-bold mb-3">
                  <span className={passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {Math.round(finalScore)}%
                  </span>
                </CardTitle>

                <div className="flex justify-center">
                  <Badge
                    variant={passed ? "default" : "destructive"}
                    className="text-base px-4 py-2"
                  >
                    {passed ? (
                      <><Trophy className="w-4 h-4 mr-1" /> PASSED</>
                    ) : (
                      <><AlertCircle className="w-4 h-4 mr-1" /> NOT PASSED</>
                    )}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Score Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCorrect}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalIncorrect}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Incorrect</div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{totalUnanswered}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Unanswered</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(accuracy)}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Completion Progress</span>
                    <span>{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-3" />
                </div>

                {/* Points Breakdown */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Points Earned</span>
                    <span className="font-semibold text-lg">{session.total_points_earned || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Points</span>
                    <span className="font-semibold text-lg">{session.total_points_possible || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Card (if passed certification) */}
            {isCertification && passed && (
              certificate ? (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Award className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          🎉 Certification Earned!
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300 font-mono text-sm">
                          License Key: {certificate.certificate_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link href={`/certificate/${certificate.certificate_code}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                          <Award className="w-4 h-4 mr-2" />
                          View Certificate
                        </Button>
                      </Link>
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <AlertCircle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
                          ⏳ Certificate Pending
                        </h3>
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                          You passed the certification! Set up certificates to claim yours.
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                        📝 To get your certificate:
                      </p>
                      <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-4 list-decimal">
                        <li>Open Supabase SQL Editor</li>
                        <li>Run: <code className="bg-yellow-200/50 dark:bg-yellow-800/30 px-1 rounded">database/migration_010_fix_certificate_function.sql</code></li>
                        <li>Run: <code className="bg-yellow-200/50 dark:bg-yellow-800/30 px-1 rounded">database/create_certificate_manual.sql</code></li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>

                    <div className="flex gap-3">
                      <Link href="/verify">
                        <Button variant="outline">
                          <Award className="w-4 h-4 mr-2" />
                          Check Certificates
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {/* Category Performance */}
            {Object.keys(categoryBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(categoryBreakdown).map(([category, data]) => {
                    const percentage = (data.correct / data.total) * 100
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {data.correct}/{data.total}
                            </span>
                            <Badge variant="outline">
                              {Math.round(percentage)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Failed Message (if not passed certification) */}
            {isCertification && !passed && (
              <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Certification Not Achieved
                  </h3>
                  <p className="text-red-700 dark:text-red-300 mb-4">
                    A score of {session.pass_threshold || 70}% or higher is required to pass this certification.
                    Review the study materials and try again when ready.
                  </p>
                  <div className="space-y-1 text-sm text-red-600 dark:text-red-400">
                    <p>• Minimum passing score: {session.pass_threshold || 70}%</p>
                    <p>• Your score: {Math.round(finalScore)}%</p>
                    <p>• You may retake this exam after the cooldown period</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Session Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Completed
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                  <Badge variant="outline" className="capitalize">
                    {session.assessment_type}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Questions</span>
                  <span className="text-sm font-medium">
                    {totalCorrect + totalIncorrect}/{session.total_questions}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Time Spent</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(session.time_spent_seconds || 0)}
                  </span>
                </div>

                <div className="text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                  <p className="font-medium">
                    {session.completed_at ? formatDate(session.completed_at) : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  What&apos;s Next?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {passed ? (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Congratulations!
                      </p>
                      <p className="text-green-700 dark:text-green-400">
                        {isCertification
                          ? "You've earned your certification! Share your achievement and continue learning."
                          : "Great job! Consider taking a certification exam to validate your skills officially."}
                      </p>
                    </div>
                    <Link href="/assess/start" className="block">
                      <Button className="w-full">
                        <Target className="w-4 h-4 mr-2" />
                        Take Advanced Assessment
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Keep Learning!
                      </p>
                      <p className="text-blue-700 dark:text-blue-400">
                        Review the areas for improvement and try again when ready.
                      </p>
                    </div>
                    <Link href="/assess/start" className="block">
                      <Button className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake Assessment
                      </Button>
                    </Link>
                  </>
                )}

                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/roadmap" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <span className="text-sm font-medium">Study Materials</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href="/dashboard" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <span className="text-sm font-medium">View All Results</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
