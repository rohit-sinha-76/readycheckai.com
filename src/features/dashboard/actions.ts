/**
 * Dashboard Data Layer
 *
 * All data fetching and business logic for the dashboard.
 * This is the only place that should query Supabase for dashboard data.
 * The page component consumes this and delegates rendering to atomic components.
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Target,
  Star,
  Crown,
  CheckCircle,
  Lock,
  AlertCircle,
  Cpu,
  Zap,
  ShieldCheck,
  LayoutGrid,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CertStatus = 'earned' | 'available' | 'locked'

export interface EnrichedCertLevel {
  code: string
  name: string
  description: string
  maxAttempts: number
  cooldownDays: number
  prerequisites: string[]
  status: CertStatus
  score: number | null
  earnedDate: string | null
  attempts: number
}

export interface RecentAssessment {
  id: string
  date: string
  score: number
  type: string
  certification_level: string | null
}

export interface DashboardStats {
  totalAssessments: number
  completedAssessments: number
  earnedCertificates: number
  certificationAttempts: number
}

export interface DashboardUser {
  name: string
  email: string
  plan: string
  subscription_plan: string
  assessmentsCompleted: number
  certificates: string[]
  nextCertification: string
  totalPoints: number
}

export interface DashboardData {
  user: DashboardUser
  certificationLevels: EnrichedCertLevel[]
  recentAssessments: RecentAssessment[]
  stats: DashboardStats
}

// ─────────────────────────────────────────────────────────────────────────────
// Static configuration (no business logic change if moved to DB later)
// ─────────────────────────────────────────────────────────────────────────────

const CERT_LEVELS = [
  {
    code: 'RCAF',
    name: 'ReadyCheck AI Fundamentals',
    description: 'Master the basics of AI and machine learning',
    maxAttempts: 3,
    cooldownDays: 7,
    prerequisites: [] as string[],
  },
  {
    code: 'RCAP',
    name: 'ReadyCheck AI Practitioner',
    description: 'Apply AI tools and techniques in real-world scenarios',
    maxAttempts: 3,
    cooldownDays: 14,
    prerequisites: ['RCAF'],
  },
  {
    code: 'RCGS',
    name: 'ReadyCheck Governance Specialist',
    description: 'Lead AI governance and ethical implementation',
    maxAttempts: 2,
    cooldownDays: 21,
    prerequisites: ['RCAF', 'RCAP'],
  },
  {
    code: 'RCSA',
    name: 'ReadyCheck Strategic Architect',
    description: 'Design enterprise AI strategies and roadmaps',
    maxAttempts: 2,
    cooldownDays: 30,
    prerequisites: ['RCAF', 'RCAP', 'RCGS'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Icon maps — exported so components can use them without re-declaring
// ─────────────────────────────────────────────────────────────────────────────

export const CERT_ICONS: Record<string, LucideIcon> = {
  RCAF: Cpu,
  RCAP: Zap,
  RCGS: ShieldCheck,
  RCSA: LayoutGrid,
}

export const STATUS_ICONS: Record<CertStatus | string, LucideIcon> = {
  earned: CheckCircle,
  available: Target,
  locked: Lock,
  default: AlertCircle,
}

export const STATUS_COLORS: Record<CertStatus | string, string> = {
  earned: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  available: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  locked: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
}

export const DASHBOARD_STAT_CONFIGS = (
  stats: DashboardStats,
  user: DashboardUser
): Array<{ label: string; value: string | number; change: string; icon: LucideIcon }> => [
  {
    label: 'Certificates Earned',
    value: stats.earnedCertificates,
    change: `${stats.earnedCertificates} total`,
    icon: Award,
  },
  {
    label: 'Assessments Completed',
    value: stats.completedAssessments,
    change: `${stats.completedAssessments} of ${stats.totalAssessments}`,
    icon: Target,
  },
  {
    label: 'Total Points',
    value: user.totalPoints.toLocaleString(),
    change: 'Across all assessments',
    icon: Star,
  },
  {
    label: 'Next Certification',
    value: user.nextCertification,
    change: 'Available to attempt',
    icon: Crown,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Pure business logic — fully testable, no JSX
// ─────────────────────────────────────────────────────────────────────────────

export function enrichCertificationLevels(
  levels: typeof CERT_LEVELS,
  certificates: Array<{ certification_level: string; score: number; passed_at: string }> | null
): EnrichedCertLevel[] {
  return levels.map((level) => {
    const earnedCert = certificates?.find((c) => c.certification_level === level.code)
    const hasPrerequisites = level.prerequisites.every((prereq) =>
      certificates?.some((c) => c.certification_level === prereq)
    )

    if (earnedCert) {
      return { ...level, status: 'earned', score: earnedCert.score, earnedDate: earnedCert.passed_at, attempts: 1 }
    }

    if (hasPrerequisites || level.prerequisites.length === 0) {
      return { ...level, status: 'available', score: null, earnedDate: null, attempts: 0 }
    }

    return { ...level, status: 'locked', score: null, earnedDate: null, attempts: 0 }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/auth/login')

  const [
    { data: userProfile, error: profileError },
    { data: certificates },
    { data: recentSessions },
    { data: assessmentStats },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, full_name, subscription_plan, account_status, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_certificates')
      .select('certification_level, score, passed_at, is_revoked')
      .eq('user_id', user.id)
      .eq('is_revoked', false),
    supabase
      .from('assessment_sessions')
      .select(`
        id, assessment_type, certification_level, status,
        total_questions, answered_questions, correct_answers,
        time_spent_seconds, created_at, completed_at,
        assessment_results!inner(final_score, pass_status)
      `)
      .eq('user_id', user.id)
      .in('status', ['completed'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('assessment_sessions')
      .select('id, status, assessment_type')
      .eq('user_id', user.id),
  ])

  if (profileError || !userProfile) {
    throw new Error('Failed to fetch user profile')
  }

  const totalAssessments = assessmentStats?.length ?? 0
  const completedAssessments = assessmentStats?.filter((s) => s.status === 'completed').length ?? 0
  const certificationAttempts = assessmentStats?.filter((s) => s.assessment_type === 'certification').length ?? 0
  const earnedCertificates = certificates?.length ?? 0

  const enrichedLevels = enrichCertificationLevels(CERT_LEVELS, certificates ?? [])

  return {
    user: {
      name: userProfile.full_name || 'User',
      email: userProfile.email,
      plan: userProfile.subscription_plan,
      subscription_plan: userProfile.subscription_plan,
      assessmentsCompleted: completedAssessments,
      certificates: certificates?.map((c) => c.certification_level) ?? [],
      nextCertification: enrichedLevels.find((l) => l.status === 'available')?.code ?? 'RCAF',
      totalPoints: recentSessions?.reduce(
        (acc, s) => acc + (s.assessment_results[0]?.final_score ?? 0), 0
      ) ?? 0,
    },
    certificationLevels: enrichedLevels,
    recentAssessments: recentSessions?.map((s) => ({
      id: s.id,
      date: s.completed_at || s.created_at,
      score: s.assessment_results[0]?.final_score ?? 0,
      type: s.assessment_type,
      certification_level: s.certification_level,
    })) ?? [],
    stats: { totalAssessments, completedAssessments, earnedCertificates, certificationAttempts },
  }
})
