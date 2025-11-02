'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limiter'
import * as Sentry from '@sentry/nextjs'
import { AppError } from '@/lib/errors'
import {
  getQuestionsByLevel,
  createAssessmentSession,
  enforceAttemptLimit,
  scoreAssessment
} from '@/lib/assessment/helpers'
import { getUserPlan, getUserUsage } from '@/features/dashboard/plans'
import { logger } from '@/lib/logger'

export interface StartAssessmentInput {
  level: string
  count?: number
  category?: string
  mode?: 'practice' | 'certification'
  track?: string
}

export async function startAssessment(data: StartAssessmentInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const level = (data.level || 'rcaf').toLowerCase()
  const count = data.count || 25
  const category = data.category
  const mode = data.mode || 'practice'

  const rateLimit = await checkRateLimit(`start:${user.id}`, 10, 60)
  if (!rateLimit.allowed) {
    throw new AppError('RATE_LIMITED', 'Rate limit exceeded', 429)
  }

  if (mode === 'certification') {
    const attemptCheck = await enforceAttemptLimit(user.id, level)
    if (attemptCheck && (attemptCheck as any).canAttempt === false) {
      throw new AppError('ATTEMPT_LIMIT', (attemptCheck as any).reason || 'Max attempts reached', 400)
    }
  }

  // Freemium usage checks
  const userPlanData = await getUserPlan(user.id)
  const usageData = await getUserUsage(user.id, { level })

  const isPro = user.app_metadata?.plan === 'pro' || userPlanData?.subscriptionPlan === 'pro' || userPlanData?.planSlug === 'pro'
  const limit = userPlanData?.plan?.maxPracticePerLevelPer30d ?? 5
  const practiceRuns = usageData?.practiceSessionsLast30dForLevel ?? 0

  if (mode === 'certification') {
    if (!isPro) {
      throw new AppError('FORBIDDEN', 'Pro subscription required for certification assessments', 403)
    }
  } else {
    if (!isPro && practiceRuns >= limit) {
      throw new AppError('LIMIT_REACHED', `Free plan limit reached for practice assessments at level ${level}. Upgrade to Pro to continue.`, 403)
    }
  }

  const rawQuestions = await getQuestionsByLevel(level, count, category, mode)
  if (!rawQuestions || rawQuestions.length === 0) {
    throw new AppError('NOT_FOUND', 'No questions available for the specified criteria', 404)
  }

  // Strip correct answer & explanation before returning to client
  const questions = rawQuestions.map(({ correctAnswerIndex: _correctAnswerIndex, explanation: _explanation, ...rest }: any) => rest)

  const session = await createAssessmentSession(user.id, level, rawQuestions, mode)

  logger.info({ userId: user.id, sessionId: session?.sessionId, level, mode }, '[Assessment Start Action]')

  const sessionId = (session as any)?.sessionId || (session as any)?.id || `session_${Date.now()}`
  const expiresAt = (session as any)?.expiresAt || new Date(Date.now() + 45 * 60000).toISOString()

  return {
    ...(session || {}),
    sessionId,
    expiresAt,
    level,
    mode,
    questions,
    token: sessionId
  }
}

export interface SubmitAnswerInput {
  sessionId: string
  questionKey?: string
  question_key?: string
  selectedOptionId?: string
  selected_option_id?: string
  elapsedMs?: number
  elapsed_ms?: number
}

export async function submitAnswer(data: SubmitAnswerInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const sessionId = data.sessionId
  const question_key = data.question_key || data.questionKey
  const selected_option_id = data.selected_option_id || data.selectedOptionId
  const elapsed_ms = data.elapsed_ms ?? data.elapsedMs ?? 0

  if (!sessionId || !question_key || !selected_option_id) {
    throw new AppError('INVALID_INPUT', 'Missing required fields for submitAnswer', 400)
  }

  // Verify session ownership
  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    throw new AppError('NOT_FOUND', 'Session not found or access denied', 404)
  }

  if (session.status !== 'active') {
    throw new AppError('INVALID_STATE', 'Session is not active', 400)
  }

  const now = new Date()
  const expiresAt = new Date(session.expires_at)
  if (now > expiresAt) {
    await supabase
      .from('assessment_sessions')
      .update({ status: 'expired' })
      .eq('id', sessionId)

    throw new AppError('EXPIRED', 'Session has expired', 400)
  }

  type SessionQuestion = { question_key: string }
  const questionsData = (session.questions_data ?? []) as SessionQuestion[]

  type UserAnswerRecord = {
    selected_option_id: string | null
    elapsed_ms: number
    submitted_at: string
  }

  const currentAnswers = (session.user_answers ?? {}) as Record<string, UserAnswerRecord>
  const updatedAnswers = {
    ...currentAnswers,
    [question_key]: {
      selected_option_id,
      elapsed_ms,
      submitted_at: now.toISOString()
    }
  }

  const { error: updateError } = await supabase
    .from('assessment_sessions')
    .update({
      user_answers: updatedAnswers,
      last_activity_at: now.toISOString(),
      time_spent_seconds: (session.time_spent_seconds || 0) + Math.floor(elapsed_ms / 1000)
    })
    .eq('id', sessionId)

  if (updateError) {
    logger.error({ error: updateError, sessionId, question_key }, '[Answer Update Error]')
    throw new AppError('DATABASE_ERROR', 'Failed to save answer', 500)
  }

  return {
    saved: true,
    sessionId,
    question_key,
    totalAnswered: Object.keys(updatedAnswers).length,
    totalQuestions: questionsData.length,
    timeRemaining: Math.max(0, expiresAt.getTime() - now.getTime())
  }
}

export interface FinalizeAssessmentInput {
  sessionId: string
}

export async function finalizeAssessment(data: FinalizeAssessmentInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { sessionId } = data

  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    throw new AppError('NOT_FOUND', 'Session not found or access denied', 404)
  }

  if (session.status === 'completed') {
    throw new AppError('ALREADY_COMPLETED', 'Session already completed', 400)
  }

  if (session.status !== 'active' && session.status !== 'expired') {
    throw new AppError('INVALID_STATE', 'Session cannot be finalized', 400)
  }

  logger.info('[Finalizing Assessment]', { userId: user.id, sessionId })

  const results = await scoreAssessment(sessionId)

  // Log assessment completion for audit
  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'ASSESSMENT_COMPLETED',
    target_type: 'assessment_session',
    target_id: sessionId,
    reason: 'User completed assessment',
    metadata: {
      level: session.certification_level,
      mode: session.assessment_type,
      score: results.score,
      passed: results.passed,
      total_questions: results.total,
      correct_answers: results.correct
    }
  })

  let certificateCreated = false
  if (session.assessment_type === 'certification' && results.passed) {
    try {
      await supabase.rpc('create_certificate', {
        p_user_id: user.id,
        p_certification_level: session.certification_level,
        p_assessment_session_id: sessionId,
        p_score: results.score
      })
      certificateCreated = true
    } catch (certError) {
      logger.error('[Certificate Error]', { error: certError, userId: user.id, sessionId })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/assess/${sessionId}/results`)

  return {
    sessionId,
    level: session.certification_level,
    mode: session.assessment_type,
    total: results.total,
    correct: results.correct,
    score: results.score,
    passed: results.passed,
    completedAt: new Date().toISOString(),
    breakdownByCategory: results.breakdownByCategory,
    certificateCreated
  }
}

export interface RecordViolationInput {
  sessionToken: string
  violationType: string
  severity: string
  description?: string
  metadata?: any
}

export async function recordViolationAction(data: RecordViolationInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { data: session } = await supabase
      .from('assessment_sessions')
      .select('id, honor_code_violations')
      .eq('id', data.sessionToken)
      .eq('user_id', user.id)
      .single()

    if (session) {
      const existing = (session.honor_code_violations ?? []) as any[]
      const updated = [
        ...existing,
        {
          type: data.violationType,
          severity: data.severity,
          description: data.description,
          timestamp: new Date().toISOString(),
          metadata: data.metadata
        }
      ]

      await supabase
        .from('assessment_sessions')
        .update({ honor_code_violations: updated })
        .eq('id', session.id)
    }

    return { success: true }
  } catch (error) {
    Sentry.captureException(error)
    logger.error({ error, data }, '[Record Violation Action Error]')
    return { success: false }
  }
}

export async function getAssessmentOptions() {
  const availableLevels = [
    { level: 'rcaf', total_questions: 25, categories: [], difficulty_distribution: {} },
    { level: 'rcap', total_questions: 30, categories: [], difficulty_distribution: {} },
    { level: 'rcgs', total_questions: 35, categories: [], difficulty_distribution: {} },
    { level: 'rcsa', total_questions: 50, categories: [], difficulty_distribution: {} }
  ]
  const policies = {
    maxAttemptsPerLevel: 3,
    retakeCooldownMinutes: 30,
    perQuestionSeconds: 120,
    perQuestionSecondsDefault: 120,
    overallMinutes: 45
  }
  return { availableLevels, recentSessions: [], policies }
}

export async function submitAssessment(data: { sessionId: string; answers: Record<string, string> }) {
  return finalizeAssessment({ sessionId: data.sessionId })
}
