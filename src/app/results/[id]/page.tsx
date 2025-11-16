import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  Share2,
  TrendingUp,
  Target,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Trophy,
  Award,
  RefreshCw,
  Clock
} from 'lucide-react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

// Helper functions
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function getStatusBadge(status: string) {
  const colors = {
    completed: 'bg-green-100 text-green-800',
    violated: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800',
    active: 'bg-blue-100 text-blue-800'
  }
  return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>{status}</Badge>
}

function getPassStatusBadge(passed: boolean) {
  return passed ?
    <Badge className="bg-green-100 text-green-800">
      <Trophy className="w-3 h-3 mr-1" />
      PASSED
    </Badge>
    : <Badge variant="destructive">
      <AlertCircle className="w-3 h-3 mr-1" />
      FAILED
    </Badge>
}

async function getSessionDetails(sessionId: string): Promise<unknown> {
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

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get session details with RLS protection
  const { data: session, error } = await supabase
    .from('assessment_sessions')
    .select(`
      *,
      assessment_results (
        id,
        session_id,
        final_score,
        pass_status,
        category_scores,
        recommendations,
        created_at
      )
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id) // RLS protection - user can only see their own sessions
    .single()

  if (error || !session) {
    console.error('Session fetch error:', error)
    notFound()
  }

  return session
}

export default async function ResultsDetailPage({ params }: PageProps) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getSessionDetails(id) as any
  const result = session.assessment_results?.[0]

  const accuracy = session.total_questions > 0 ? (session.correct_answers / session.total_questions) * 100 : 0
  const completionRate = session.total_questions > 0 ? (session.answered_questions / session.total_questions) * 100 : 0
  const finalScore = result?.final_score || Math.round(accuracy)
  const passed = result?.pass_status || finalScore >= 70

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/results">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Results
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assessment Results</h1>
              <p className="text-gray-600">
                {session.assessment_type === 'certification' ? 'Certification' : 'Practice'} Assessment
                {session.certification_level && ` • ${session.certification_level}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Score Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-blue-600 mb-2">
                    {finalScore}%
                  </div>
                  {getPassStatusBadge(passed)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{session.correct_answers}</div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {session.answered_questions - session.correct_answers}
                    </div>
                    <div className="text-sm text-gray-600">Incorrect</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {session.total_questions - session.answered_questions}
                    </div>
                    <div className="text-sm text-gray-600">Unanswered</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{Math.round(accuracy)}%</div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Completion Progress</span>
                    <span>{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Performance Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                        <span>Strong performance in fundamental concepts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                        <span>Good time management with {formatTime(session.time_spent_seconds)} completion</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                        <span>Consistent accuracy across question types</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                        <span>Advanced application scenarios</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                        <span>Complex problem-solving approaches</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                        <span>Industry-specific knowledge gaps</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  {getStatusBadge(session.status)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Type</span>
                  <Badge variant="outline" className="capitalize">
                    {session.assessment_type}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Questions</span>
                  <span className="text-sm font-medium">
                    {session.answered_questions}/{session.total_questions}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Time Spent</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(session.time_spent_seconds)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Points</span>
                  <span className="text-sm font-medium">
                    {session.total_points}
                  </span>
                </div>

                <div className="text-sm">
                  <p className="text-gray-600 mb-1">Completed</p>
                  <p className="font-medium">
                    {session.completed_at ? new Date(session.completed_at).toLocaleString() : 'In progress'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {passed ? (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-green-800 mb-2">🎉 Congratulations!</p>
                      <p className="text-green-700">You passed this assessment. Consider taking a more advanced assessment or pursuing certification.</p>
                    </div>
                    <Button className="w-full" asChild>
                      <Link href="/assess/start">
                        <Award className="w-4 h-4 mr-2" />
                        Take Advanced Assessment
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 mb-2">Keep Learning!</p>
                      <p className="text-blue-700">Review the areas for improvement and try again when ready.</p>
                    </div>
                    <Button className="w-full" asChild>
                      <Link href="/assess/start">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake Assessment
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
