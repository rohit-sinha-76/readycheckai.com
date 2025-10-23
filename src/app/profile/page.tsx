import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings, Shield, User, Award, Activity, CheckCircle2, Lock, Clock, Circle, type LucideIcon } from 'lucide-react'
import { z } from 'zod'
import { logger } from '@/lib/logger'

type CertStatus = 'completed' | 'in_progress' | 'locked' | 'not_started'

const CertStatusSchema = z.enum(['completed', 'in_progress', 'locked', 'not_started'])
const CertificationProgressSchema = z.record(z.string(), CertStatusSchema)

const CERT_STATUS_CONFIG: Record<CertStatus, {
  icon: LucideIcon
  label: string
  className: string
}> = {
  completed:   { icon: CheckCircle2, label: 'Completed',   className: 'text-emerald-600 dark:text-emerald-400' },
  in_progress: { icon: Clock,        label: 'In Progress', className: 'text-blue-600 dark:text-blue-400' },
  locked:      { icon: Lock,         label: 'Locked',      className: 'text-gray-400' },
  not_started: { icon: Circle,       label: 'Not Started', className: 'text-yellow-600 dark:text-yellow-400' },
}

export const metadata = {
  title: 'Profile - ReadyCheck AI',
  description: 'View and manage your ReadyCheck AI profile.',
}

async function getUserProfile(userId: string) {
  const supabase = await createClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      full_name,
      name,
      avatar_url,
      company_name,
      role,
      subscription_plan,
      certification_progress,
      total_practice_assessments,
      created_at
    `)
    .eq('id', userId)
    .single()

  if (error) {
    logger.error({ err: error, userId }, 'Failed to fetch user profile')
    return null
  }

  return user
}

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  const profile = await getUserProfile(user.id)
  
  if (!profile) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your account settings and view your progress
            </p>
          </div>

          {/* Profile Overview Card */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.full_name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {profile.full_name || profile.name || 'User'}
                </h2>
                <p className="text-muted-foreground mb-2">{profile.email}</p>
                
                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.role && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      <User className="w-4 h-4 mr-1" />
                      {profile.role}
                    </span>
                  )}
                  {profile.company_name && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground">
                      {profile.company_name}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <Award className="w-4 h-4 mr-1" />
                    {profile.subscription_plan === 'pro' ? 'Pro Member' : 'Free Plan'}
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex-shrink-0 text-right">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-foreground">
                    {profile.total_practice_assessments || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Assessments Taken
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Settings */}
            <Link
              href="/profile/settings"
              className="group bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Settings className="w-6 h-6 text-blue-600 dark:text-blue-300 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Profile Settings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Update your personal information and preferences
                  </p>
                </div>
              </div>
            </Link>

            {/* Security */}
            <Link
              href="/dashboard/profile/security"
              className="group bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md hover:border-green-500 dark:hover:border-green-400 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-300 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Security Settings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Change password and manage security options
                  </p>
                </div>
              </div>
            </Link>

            {/* Activity */}
            <Link
              href="/dashboard"
              className="group bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md hover:border-purple-500 dark:hover:border-purple-400 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-300 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Dashboard
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    View your assessments and certifications
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Certification Progress */}
          {profile.certification_progress && (() => {
            const parsed = CertificationProgressSchema.safeParse(profile.certification_progress)
            if (!parsed.success) return null
            return (
              <div className="mt-6 bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Certification Progress
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(parsed.data).map(([cert, status]) => {
                    const config = CERT_STATUS_CONFIG[status]
                    const StatusIcon = config.icon
                    return (
                      <div key={cert} className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground uppercase mb-2">
                          {cert.toUpperCase()}
                        </div>
                        <div className={`flex items-center gap-1.5 text-sm font-semibold ${config.className}`}>
                          <StatusIcon className="w-4 h-4 flex-shrink-0" />
                          {config.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </main>
  )
}
