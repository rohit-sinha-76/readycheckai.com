/**
 * Assessment Helper Functions
 * Server-side utilities for assessment management
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type { QuestionResponse } from '@/contracts/assessment'

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Difficulty distribution weights
const DIFFICULTY_WEIGHTS = {
  beginner: 0.25,
  intermediate: 0.45,
  advanced: 0.25,
  expert: 0.05
}

// Assessment policies
const ASSESSMENT_POLICIES = {
  maxAttemptsPerLevel: 3,
  retakeCooldownMinutes: 30,
  perQuestionSecondsDefault: 120,
  overallMinutes: 45
}

/**
 * Get questions by certification level with difficulty distribution
 * For practice mode, can filter by category instead of level.
 *
 * Special case: level === "genai_free" will use the general AI usage
 * practice bank (GENAI) instead of certification questions. This powers
 * the Free AI Readiness Assessment track while keeping certification
 * flows unchanged.
 */
export async function getQuestionsByLevel(
  level: string,
  count: number = 25,
  category?: string,
  mode: 'practice' | 'certification' = 'certification'
): Promise<QuestionResponse[]> {
  try {
    // Calculate question distribution by difficulty
    const distribution = {
      beginner: Math.floor(count * DIFFICULTY_WEIGHTS.beginner),
      intermediate: Math.floor(count * DIFFICULTY_WEIGHTS.intermediate),
      advanced: Math.floor(count * DIFFICULTY_WEIGHTS.advanced),
      expert: Math.floor(count * DIFFICULTY_WEIGHTS.expert)
    }

    // Adjust for rounding differences
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0)
    if (total < count) {
      distribution.intermediate += count - total
    }

    const questions: QuestionResponse[] = []

    logger.info('[getQuestionsByLevel] Starting fetch:', { level, count, category, mode })

    const isGenaiFreeTrack = level === 'genai_free' || category === 'genai_free'

    // Special handling for free AI readiness track: pull from the full pool of
    // active practice questions in a single query, then randomly sample.
    if (isGenaiFreeTrack) {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          question_key,
          question_text,
          question_format,
          options,
          points,
          time_allocation_seconds,
          difficulty_level,
          category_id,
          certification_level,
          category_code_v2,
          assessment_question_types
        `)
        .eq('active', true)
        .eq('question_type', 'practice')
        .limit(count * 3)

      if (error) {
        logger.error('[Question Fetch Error - genai_free]', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          level,
          category,
          mode
        })
        throw new Error(`Failed to fetch practice questions for free track: ${error.message}`)
      }

      logger.info(`[getQuestionsByLevel] Fetched ${data?.length || 0} practice questions for genai_free from DB`)

      const transformedQuestions: QuestionResponse[] = (data || []).map(q => ({
        key: q.question_key,
        text: q.question_text,
        format: q.question_format || 'single_choice',
        options: q.options || [],
        points: q.points || 1,
        timeRecommended: q.time_allocation_seconds || 120
      }))

      const finalQuestions = shuffleArray(transformedQuestions).slice(0, count)
      logger.info(`[getQuestionsByLevel] Returning ${finalQuestions.length} questions for genai_free`)
      return finalQuestions
    }

    // Fetch questions for each difficulty level (certification tracks)
    const difficultyEntries = Object.entries(distribution).filter(([_, questionCount]) => questionCount > 0)

    const difficultyResults = await Promise.all(
      difficultyEntries.map(async ([difficulty, questionCount]) => {
        // Map text difficulty to numeric range (1-10)
        const difficultyRange = {
          beginner: { min: 1, max: 3 },
          intermediate: { min: 4, max: 6 },
          advanced: { min: 7, max: 9 },
          expert: { min: 10, max: 10 }
        }[difficulty] || { min: 4, max: 6 }

        logger.info(`[getQuestionsByLevel] Fetching ${questionCount} ${difficulty} questions (difficulty ${difficultyRange.min}-${difficultyRange.max})`)

        const query = supabase
          .from('questions')
          .select(`
            question_key,
            question_text,
            question_format,
            options,
            points,
            time_allocation_seconds,
            difficulty_level,
            category_id,
            certification_level,
            category_code_v2,
            assessment_question_types
          `)
          .gte('difficulty_level', difficultyRange.min)
          .lte('difficulty_level', difficultyRange.max)
          .eq('active', true)
          .eq('question_type', 'certification')
          .eq('certification_level', level)
          .limit(questionCount * 2)

        const { data, error } = await query

        if (error) {
          logger.error('[Question Fetch Error]', { 
            error, 
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            level, 
            difficulty, 
            category,
            mode,
            difficultyRange
          })
          throw new Error(`Failed to fetch ${difficulty} questions: ${error.message}`)
        }

        logger.info(`[getQuestionsByLevel] Fetched ${data?.length || 0} ${difficulty} questions from DB`)

        // Transform to response format (no correct answers)
        const transformedQuestions: QuestionResponse[] = (data || []).map(q => ({
          key: q.question_key,
          text: q.question_text,
          format: q.question_format || 'single_choice',
          options: q.options || [],
          points: q.points || 1,
          timeRecommended: q.time_allocation_seconds || 120
        }))

        // Shuffle and take only the requested count
        const shuffled = shuffleArray(transformedQuestions)
        return shuffled.slice(0, questionCount)
      })
    )

    for (const chunk of difficultyResults) {
      questions.push(...chunk)
    }

    logger.info(`[getQuestionsByLevel] Total questions assembled: ${questions.length}`)

    // Shuffle final question order
    const finalQuestions = shuffleArray(questions).slice(0, count)
    logger.info(`[getQuestionsByLevel] Returning ${finalQuestions.length} questions`)
    return finalQuestions

  } catch (error) {
    logger.error('[getQuestionsByLevel Error]', { error, level, count, category })
    throw error
  }
}

/**
 * Create assessment session
 */
export async function createAssessmentSession(
  userId: string,
  level: string | null,
  questions: QuestionResponse[],
  mode: 'practice' | 'certification',
  options?: {
    timeLimitMinutes?: number
    passThreshold?: number | null
    track?: string | null
  }
): Promise<{
  sessionId: string
  expiresAt: string
}> {
  try {
    const sessionId = crypto.randomUUID()
    const timeLimitMinutes = options?.timeLimitMinutes ?? ASSESSMENT_POLICIES.overallMinutes
    const expiresAt = new Date(Date.now() + timeLimitMinutes * 60 * 1000)

    const passThreshold = mode === 'certification'
      ? (options?.passThreshold ?? 70)
      : (options?.passThreshold ?? null)

    const { error } = await supabase
      .from('assessment_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        session_token: sessionId,
        assessment_type: mode,
        certification_level:
          mode === 'certification'
            ? level
            : options?.track
              ? null
              : level,
        total_questions: questions.length,
        time_limit_minutes: timeLimitMinutes,
        pass_threshold: passThreshold,
        questions_data: questions.map(q => ({
          question_key: q.key,
          track: options?.track ?? null
        })),
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })

    if (error) {
      logger.error('[Session Creation Error]', { error, userId, level, mode })
      throw new Error('Failed to create assessment session')
    }

    // Log session creation (console logging for now - admin_audit_log is for admin actions only)
    logger.info('[Assessment Session Created]', {
      sessionId,
      userId,
      level,
      mode,
      questionCount: questions.length,
      track: options?.track ?? null,
      timeLimitMinutes
    })

    return {
      sessionId,
      expiresAt: expiresAt.toISOString()
    }

  } catch (error) {
    logger.error('[createAssessmentSession Error]', { error, userId, level })
    throw error
  }
}

/**
 * Check attempt limits and cooldown
 */
export async function enforceAttemptLimit(
  userId: string,
  level: string
): Promise<{ canAttempt: boolean; reason?: string }> {
  try {
    // Get recent attempts for this level
    const { data: attempts, error } = await supabase
      .from('assessment_sessions')
      .select('completed_at, final_score')
      .eq('user_id', userId)
      .eq('certification_level', level)
      .eq('assessment_type', 'certification')
      .order('completed_at', { ascending: false })
      .limit(ASSESSMENT_POLICIES.maxAttemptsPerLevel)

    if (error) {
      logger.error('[Attempt Limit Check Error]', { error, userId, level })
      throw new Error('Failed to check attempt limits')
    }

    // Check if max attempts reached
    if (attempts && attempts.length >= ASSESSMENT_POLICIES.maxAttemptsPerLevel) {
      return {
        canAttempt: false,
        reason: `Maximum ${ASSESSMENT_POLICIES.maxAttemptsPerLevel} attempts reached for ${level}`
      }
    }

    // Check cooldown period
    if (attempts && attempts.length > 0) {
      const lastAttempt = attempts[0]
      if (lastAttempt.completed_at) {
        const cooldownEnd = new Date(lastAttempt.completed_at)
        cooldownEnd.setMinutes(cooldownEnd.getMinutes() + ASSESSMENT_POLICIES.retakeCooldownMinutes)
        
        if (new Date() < cooldownEnd) {
          return {
            canAttempt: false,
            reason: `Cooldown period active. Next attempt available at ${cooldownEnd.toISOString()}`
          }
        }
      }
    }

    return { canAttempt: true }

  } catch (error) {
    logger.error('[enforceAttemptLimit Error]', { error, userId, level })
    throw error
  }
}

/**
 * Score assessment based on submitted answers
 */
export async function scoreAssessment(sessionId: string): Promise<{
  total: number
  correct: number
  score: number
  passed: boolean
  breakdownByCategory: Array<{ category: string; correct: number; total: number }>
}> {
  try {
    logger.info('[scoreAssessment] Starting scoring for session:', sessionId)
    
    // Get session with answers
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      logger.error('[scoreAssessment] Session fetch error:', sessionError)
      throw new Error(`Session fetch failed: ${sessionError.message}`)
    }

    if (!session) {
      logger.error('[scoreAssessment] Session not found')
      throw new Error('Session not found')
    }

    type SessionQuestion = { question_key: string }
    const questionsData = (session.questions_data ?? []) as SessionQuestion[]

    logger.info('[scoreAssessment] Session data:', { 
      id: session.id, 
      questionsCount: questionsData.length,
      answersCount: Object.keys(session.user_answers ?? {}).length
    })

    // Get question details with correct answers
    const questionKeys = questionsData.map(q => q.question_key)
    logger.info('[scoreAssessment] Question keys:', questionKeys)
    
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        question_key,
        correct_answer_index,
        correct_answer_id,
        points_base,
        category_code_v2
      `)
      .in('question_key', questionKeys)

    if (questionsError) {
      logger.error('[scoreAssessment] Questions fetch error:', questionsError)
      throw new Error(`Failed to fetch question details: ${questionsError.message}`)
    }

    if (!questions || questions.length === 0) {
      logger.error('[scoreAssessment] No questions found for keys:', questionKeys)
      throw new Error('No questions found for this assessment')
    }

    logger.info('[scoreAssessment] Fetched questions:', questions.length)

    // Calculate scores
    let totalCorrect = 0
    let totalPoints = 0
    let earnedPoints = 0
    const categoryBreakdown: Record<string, { correct: number; total: number }> = {}

    type UserAnswersMap = Record<string, { selected_option_id?: string | null }>
    const userAnswers = (session.user_answers ?? {}) as UserAnswersMap

    questions.forEach(question => {
      const userAnswer = userAnswers[question.question_key]
      
      // Extract index from option ID (e.g., "option_2" => 2)
      const selectedIndex = userAnswer?.selected_option_id 
        ? parseInt(userAnswer.selected_option_id.replace('option_', '')) 
        : -1
      
      // Compare with correct_answer_index from database
      const isCorrect = selectedIndex === question.correct_answer_index
      const points = question.points_base || 1
      
      logger.info('[scoreAssessment] Question scoring:', {
        question_key: question.question_key,
        selected_option_id: userAnswer?.selected_option_id,
        selectedIndex,
        correct_answer_index: question.correct_answer_index,
        isCorrect
      })

      totalPoints += points
      if (isCorrect) {
        totalCorrect++
        earnedPoints += points
      }

      // Category breakdown
      const category = question.category_code_v2 || 'unknown'
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { correct: 0, total: 0 }
      }
      categoryBreakdown[category].total++
      if (isCorrect) {
        categoryBreakdown[category].correct++
      }
    })

    const score = Math.round((earnedPoints / totalPoints) * 100)
    const passed = score >= 70 // 70% pass threshold

    logger.info('[scoreAssessment] Calculated results:', {
      totalQuestions: questions.length,
      totalCorrect,
      totalPoints,
      earnedPoints,
      score,
      passed
    })

    // Update session with results
    const { error: updateError } = await supabase
      .from('assessment_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        final_score: score,
        passed,
        total_points_earned: earnedPoints,
        total_points_possible: totalPoints
      })
      .eq('id', sessionId)

    if (updateError) {
      logger.error('[scoreAssessment] Session update error:', updateError)
      throw new Error(`Failed to update session: ${updateError.message}`)
    }

    logger.info('[scoreAssessment] Session updated successfully')

    return {
      total: questions.length,
      correct: totalCorrect,
      score,
      passed,
      breakdownByCategory: Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        correct: data.correct,
        total: data.total
      }))
    }

  } catch (error) {
    logger.error('[scoreAssessment Error]', { error, sessionId })
    throw error
  }
}

/**
 * Utility: Shuffle array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export { ASSESSMENT_POLICIES }
