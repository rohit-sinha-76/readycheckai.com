import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Calendar,
  Clock,
  Target,
  ArrowRight,
  CheckCircle,
  FileText,
  BarChart3,
  Award
} from 'lucide-react'

interface AssessmentSession {
  id: string
  session_token: string
  assessment_type: 'practice' | 'certification'
  certification_level: string | null
  category_id: string | null
  status: 'active' | 'completed' | 'expired' | 'violated'
  total_questions: number
  total_points_earned: number
  total_points_possible: number
  time_spent_seconds: number
  created_at: string
  completed_at: string | null
  expires_at: string
  final_score: number | null
  passed: boolean | null
  certificates?: { certificate_code: string }[]
}

async function getUserAssessmentSessions(
  page: number = 1,
  category?: string,
  status?: string
): Promise<{ sessions: AssessmentSession[]; totalCount: number; totalPages: number }> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  const limit = 20
  const offset = (page - 1) * limit

  // Build query with filters - query assessment_sessions directly
  let query = supabase
    .from('assessment_sessions')
    .select(`
      id,
      session_token,
      assessment_type,
      certification_level,
      category_id,
      status,
      total_questions,
      time_spent_seconds,
      created_at,
      completed_at,
      expires_at,
      final_score,
      passed,
      total_points_earned,
      total_points_possible,
      certificates!left(certificate_code)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) {
    query = query.eq('category_id', category)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data: sessions, error } = await query

  if (error) {
    console.error('Error fetching assessment sessions:', {
      error,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      userId: user.id,
      filters: { category, status }
    })
    // Return empty results instead of throwing to prevent page crash
    return {
      sessions: [],
      totalCount: 0,
      totalPages: 0
    }
  }

  // Get total count for pagination
  let countQuery = supabase
    .from('assessment_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (category) {
    countQuery = countQuery.eq('category_id', category)
  }

  if (status) {
    countQuery = countQuery.eq('status', status)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Error getting session count:', countError)
  }

  return {
    sessions: (sessions as unknown as AssessmentSession[]) || [],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    category?: string
    status?: string
  }>
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page || '1')
  const category = resolvedSearchParams.category
  const status = resolvedSearchParams.status

  const { sessions, totalCount, totalPages } = await getUserAssessmentSessions(page, category, status)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="text-blue-600" />
                Assessment Results
              </h1>
              <p className="text-muted-foreground mt-2">
                Track your progress and review your assessment performance
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/verify">
                <Button variant="outline" className="bg-card">
                  <Award className="w-4 h-4 mr-2" />
                  Certificates
                </Button>
              </Link>
              <Link href="/assess/start">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Target className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filter Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex gap-2">
                <Link
                  href="/results"
                  className={`px-3 py-1 rounded-full text-sm ${!category && !status
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                >
                  All Results
                </Link>
                <Link
                  href="/results?status=completed"
                  className={`px-3 py-1 rounded-full text-sm ${status === 'completed'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                >
                  Completed
                </Link>
                <Link
                  href="/results?category=fundamentals"
                  className={`px-3 py-1 rounded-full text-sm ${category === 'fundamentals'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                >
                  Fundamentals
                </Link>
                <Link
                  href="/results?category=technical"
                  className={`px-3 py-1 rounded-full text-sm ${category === 'technical'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                >
                  Technical
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Assessments</p>
                    <p className="text-3xl font-bold text-foreground">{totalCount}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold text-green-600">
                      {sessions.filter(s => s.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {Math.round(
                        sessions
                          .filter(s => s.final_score !== null)
                          .reduce((acc, s) => acc + (s.final_score || 0), 0) /
                        sessions.filter(s => s.final_score !== null).length || 0
                      )}%
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Certificates Earned</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {sessions.filter(s => s.passed && s.assessment_type === 'certification').length}
                    </p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4 mb-8">
          {sessions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Results Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your first assessment to see your results here
                </p>
                <Link href="/assess/start">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Target className="w-4 h-4 mr-2" />
                    Start Assessment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => {
              // answeredCount removed - was unused
              const completionRate = session.status === 'completed' ? 100 : 0
              const hasCertificate = session.passed && session.assessment_type === 'certification'


              return (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            variant={session.status === 'completed' ? 'default' : 'secondary'}
                            className={
                              session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  session.status === 'expired' ? 'bg-secondary text-secondary-foreground' :
                                    'bg-red-100 text-red-800'
                            }
                          >
                            {session.status}
                          </Badge>
                          <Badge variant="outline">
                            {session.assessment_type === 'certification' ? 'Certification' : 'Practice'}
                          </Badge>
                          {session.certification_level && (
                            <Badge variant="outline" className="text-purple-700 border-purple-200">
                              {session.certification_level}
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {session.assessment_type === 'certification' ? session.certification_level : 'Practice'} Assessment
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(session.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.round(session.time_spent_seconds / 60)} min
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {session.total_questions} questions
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{Math.round(completionRate)}%</span>
                          </div>
                          <Progress value={completionRate} className="h-2" />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {session.final_score !== null && (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-foreground">
                              {session.final_score}%
                            </div>
                            <div className={`text-sm ${session.passed ? 'text-green-600' : 'text-red-600'}`}>
                              {session.passed ? 'Passed' : 'Failed'}
                            </div>
                            {hasCertificate && (
                              <Badge className="mt-1 bg-yellow-100 text-yellow-800">
                                <Trophy className="w-3 h-3 mr-1" />
                                Certificate Earned
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-2 min-w-[140px]">
                          {hasCertificate && session.certificates?.[0]?.certificate_code && (
                            <Link href={`/certificate/${session.certificates[0].certificate_code}`}>
                              <Button size="sm" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                                <Award className="w-4 h-4 mr-2" />
                                View Certificate
                              </Button>
                            </Link>
                          )}
                          <Link href={`/assess/${session.id}/results`}>
                            <Button variant="outline" size="sm" className="w-full">
                              View Details
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/results?page=${page - 1}${category ? `&category=${category}` : ''}${status ? `&status=${status}` : ''}`}
              >
                <Button variant="outline">Previous</Button>
              </Link>
            )}

            <span className="flex items-center px-4 py-2 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={`/results?page=${page + 1}${category ? `&category=${category}` : ''}${status ? `&status=${status}` : ''}`}
              >
                <Button variant="outline">Next</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
