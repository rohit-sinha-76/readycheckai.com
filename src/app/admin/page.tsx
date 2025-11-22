import { checkAdminAccess, getAdminSupabaseClient, logAdminAction } from '@/features/admin/actions'
import { AdminHeader } from '@/features/admin/components/admin-header'
import { AdminStatCard } from '@/features/admin/components/admin-stat-card'
import { AdminQuickActions } from '@/features/admin/components/admin-quick-actions'
import { ActivityFeed } from '@/features/admin/components/activity-feed'
import { LastLoginsModal } from '@/features/admin/components/last-logins-modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  FileText,
  Shield,
  TrendingUp,
  Target,
  Award,
  Activity,
  Database,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// Analytics data fetching with proper admin auth
async function getAdminAnalytics() {
  const supabase = await getAdminSupabaseClient()

  // Get user stats
  const { data: users } = await supabase
    .from('users')
    .select('id, subscription_plan, account_status, created_at, role')

  // Get assessment stats
  const { data: assessmentSessions } = await supabase
    .from('assessment_sessions')
    .select('id, user_id, status, assessment_type, created_at, assessment_results(final_score)')

  // Get certificate stats
  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, user_id, certification_level, created_at, score')

  // Get question bank stats
  const { data: questions } = await supabase
    .from('questions')
    .select('id, active, difficulty_level, status_flags')

  // Get recent audit logs
  const { data: auditLogs } = await supabase
    .from('admin_audit_log')
    .select('id, admin_id, action, target_type, target_id, details, success, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Get recent admin logins
  const { data: recentLogins } = await supabase
    .from('admin_audit_log')
    .select('id, admin_id, action, details, created_at')
    .eq('action', 'DASHBOARD_ACCESSED')
    .order('created_at', { ascending: false })
    .limit(20)

  // Calculate analytics
  const totalUsers = users?.length || 0
  const proUsers = users?.filter((u: any) => u.subscription_plan === 'pro').length || 0
  const activeUsers = users?.filter((u: any) => u.account_status === 'active').length || 0
  const adminUsers = users?.filter((u: any) => u.role === 'admin' || u.role === 'superadmin').length || 0

  const totalAssessments = assessmentSessions?.length || 0
  const completedAssessments = assessmentSessions?.filter((s: any) => s.status === 'completed').length || 0
  const certificationAttempts = assessmentSessions?.filter((s: any) => s.assessment_type === 'certification').length || 0

  const totalCertificates = certificates?.length || 0
  const sessionsWithScores = assessmentSessions?.filter((s: any) => s.assessment_results?.[0]?.final_score) || []
  const averageScore = sessionsWithScores.length > 0
    ? sessionsWithScores.reduce((acc: any, s: any) => acc + (s.assessment_results?.[0]?.final_score || 0), 0) / sessionsWithScores.length
    : 0

  const totalQuestions = questions?.length || 0
  const activeQuestions = questions?.filter((q: any) => q.active || q.status_flags?.published).length || 0

  // Certification level stats
  const certificationStats = {
    'RCAF': {
      attempts: assessmentSessions?.filter((s: any) => s.assessment_type === 'certification' && s.status === 'completed').length || 0,
      completions: certificates?.filter((c: any) => c.certification_level === 'RCAF').length || 0,
      averageScore: (() => {
        const rcafCerts = certificates?.filter((c: any) => c.certification_level === 'RCAF') || []
        return rcafCerts.length > 0 ? rcafCerts.reduce((acc: any, c: any) => acc + (c.score || 0), 0) / rcafCerts.length : 0
      })()
    },
    'RCAP': {
      attempts: 0,
      completions: certificates?.filter((c: any) => c.certification_level === 'RCAP').length || 0,
      averageScore: (() => {
        const rcapCerts = certificates?.filter((c: any) => c.certification_level === 'RCAP') || []
        return rcapCerts.length > 0 ? rcapCerts.reduce((acc: any, c: any) => acc + (c.score || 0), 0) / rcapCerts.length : 0
      })()
    },
    'RCGS': {
      attempts: 0,
      completions: certificates?.filter((c: any) => c.certification_level === 'RCGS').length || 0,
      averageScore: (() => {
        const rcgsCerts = certificates?.filter((c: any) => c.certification_level === 'RCGS') || []
        return rcgsCerts.length > 0 ? rcgsCerts.reduce((acc: any, c: any) => acc + (c.score || 0), 0) / rcgsCerts.length : 0
      })()
    },
    'RCSA': {
      attempts: 0,
      completions: certificates?.filter((c: any) => c.certification_level === 'RCSA').length || 0,
      averageScore: (() => {
        const rcsaCerts = certificates?.filter((c: any) => c.certification_level === 'RCSA') || []
        return rcsaCerts.length > 0 ? rcsaCerts.reduce((acc: any, c: any) => acc + (c.score || 0), 0) / rcsaCerts.length : 0
      })()
    }
  }

  // Format recent activity from audit logs
  const recentActivity = auditLogs?.map((log: any) => ({
    id: log.id,
    type: log.action || 'system_event',
    message: log.details?.message || log.action || 'Admin action performed',
    timestamp: new Date(log.created_at).toLocaleString(),
    severity: (log.success === false ? 'error' : log.action?.includes('DELETE') || log.action?.includes('REVOKE') ? 'warning' : 'info') as 'error' | 'warning' | 'info' | 'success'
  })) || []

  // Format login records
  const loginRecords = recentLogins?.map((login: any) => ({
    id: login.id,
    user_email: login.details?.email || 'Unknown',
    user_role: login.details?.role || 'user',
    login_time: login.created_at,
    ip_address: login.details?.ip,
    user_agent: login.details?.user_agent,
    location: login.details?.location
  })) || []

  return {
    overview: {
      totalUsers,
      proUsers,
      activeUsers,
      adminUsers,
      totalAssessments,
      completedAssessments,
      totalCertificates,
      averageScore: Math.round(averageScore * 10) / 10 || 0
    },
    engagement: {
      conversionRate: totalUsers > 0 ? proUsers / totalUsers : 0,
      completionRate: totalAssessments > 0 ? completedAssessments / totalAssessments : 0,
      certificationRate: totalAssessments > 0 ? certificationAttempts / totalAssessments : 0
    },
    certifications: certificationStats,
    questions: {
      totalQuestions,
      activeQuestions,
      averageDifficulty: questions && questions.length > 0
        ? questions.reduce((acc: any, q: any) => acc + (q.difficulty_level || 5), 0) / questions.length / 10
        : 0.5
    },
    recentActivity,
    loginRecords
  }
}

export default async function AdminDashboard() {
  // Secure admin access check
  const { user, userProfile } = await checkAdminAccess()

  // Log admin dashboard access
  await logAdminAction(user.id, {
    action: 'DASHBOARD_ACCESSED',
    resourceType: 'admin_panel',
    details: {
      role: userProfile.role,
      email: userProfile.email
    }
  })

  const { overview, engagement, certifications, questions, recentActivity, loginRecords } = await getAdminAnalytics()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <AdminHeader
        userEmail={userProfile.email || ''}
        userRole={userProfile.role || 'admin'}
        requires2FA={userProfile.requires_2fa ?? false}
        twoFactorEnabled={userProfile.two_factor_enabled ?? false}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Security Alert Banner */}
        {userProfile.requires_2fa && !userProfile.two_factor_enabled && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">Security Action Required</p>
                  <p className="text-sm text-yellow-700">Two-factor authentication is required for your admin account</p>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link href="/settings/security">Enable 2FA Now</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Page Header with Actions */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">Monitor system performance and user activity</p>
          </div>
          <LastLoginsModal logins={loginRecords} />
        </div>

        {/* Key Metrics Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <AdminStatCard
            title="Total Users"
            value={overview.totalUsers.toLocaleString()}
            icon={Users}
            description={`${overview.proUsers} Pro • ${overview.activeUsers} Active`}
            variant="info"
            trend={{ value: 12, isPositive: true }}
          />
          <AdminStatCard
            title="Total Assessments"
            value={overview.totalAssessments.toLocaleString()}
            icon={FileText}
            description={`${overview.completedAssessments} completed`}
            variant="default"
            trend={{ value: 8, isPositive: true }}
          />
          <AdminStatCard
            title="Certificates Issued"
            value={overview.totalCertificates.toLocaleString()}
            icon={Award}
            description="Active certifications"
            variant="success"
            trend={{ value: 15, isPositive: true }}
          />
          <AdminStatCard
            title="Average Score"
            value={`${overview.averageScore}%`}
            icon={TrendingUp}
            description="Across all assessments"
            variant="warning"
            trend={{ value: 3, isPositive: true }}
          />
        </div>

        {/* Quick Actions Card */}
        <div className="mb-8">
          <AdminQuickActions />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Certification Performance - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Certification Performance
                </CardTitle>
                <CardDescription>
                  Completion rates and average scores by certification level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(certifications).map(([level, stats]) => {
                    const completionRate = overview.totalUsers > 0
                      ? (stats.completions / overview.totalUsers) * 100
                      : 0

                    return (
                      <div key={level} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-semibold">
                              {level}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {stats.completions} earned
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {Math.round(stats.averageScore)}% avg
                            </span>
                          </div>
                        </div>
                        <Progress value={Math.min(completionRate, 100)} className="h-2" />
                        <p className="text-xs text-gray-500">
                          {completionRate.toFixed(1)}% of users completed
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  User Engagement
                </CardTitle>
                <CardDescription>Active users and conversion metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{overview.activeUsers}</p>
                    <p className="text-sm text-gray-600 mt-1">Active Users</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {(engagement.conversionRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Pro Conversion</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">
                      {(engagement.completionRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed - Takes 1 column */}
          <div>
            <ActivityFeed activities={recentActivity} maxHeight="600px" />
          </div>
        </div>

        {/* Question Bank Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Question Bank Analytics
            </CardTitle>
            <CardDescription>Performance metrics and difficulty analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-4xl font-bold text-blue-600">{questions.totalQuestions}</p>
                <p className="text-sm text-gray-600 mt-2">Total Questions</p>
                <Button variant="link" size="sm" className="mt-2" asChild>
                  <Link href="/admin/questions">
                    View All →
                  </Link>
                </Button>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-4xl font-bold text-green-600">{questions.activeQuestions}</p>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mt-2">Active Questions</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((questions.activeQuestions / Math.max(questions.totalQuestions, 1)) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-4xl font-bold text-purple-600">
                  {(questions.averageDifficulty * 10).toFixed(1)}/10
                </p>
                <p className="text-sm text-gray-600 mt-2">Average Difficulty</p>
                <p className="text-xs text-gray-500 mt-1">Difficulty score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
