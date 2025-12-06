/**
 * Server Actions for AI Roadmap Generation
 * 
 * These functions run on the server and handle:
 * - Checking generation limits
 * - Analyzing user assessments for weak/strong areas
 * - Generating roadmaps via Gemini AI
 * - Tracking progress on tasks
 * 
 * @security All actions verify user authentication
 * @security API keys and scoring are handled server-side only
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateRoadmap as callGemini, countTotalTasks } from '@/lib/gemini'
import { roadmapFormSchema, updateProgressSchema } from '@/contracts/roadmap'
import { checkRateLimit } from '@/lib/rate-limiter'
import * as Sentry from '@sentry/nextjs'
import { AppError } from '@/lib/errors'
import { inngest } from '@/lib/inngest'
import type {
    GenerationLimitStatus,
    AssessmentRequirementStatus,
    RoadmapRecord
} from '@/types/roadmap'

export async function requestRoadmapGeneration(data: { track: string; level: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new AppError('UNAUTHORIZED', 'Login required', 401)

  const rateLimit = await checkRateLimit(`roadmap:${user.id}`, 3, 3600)
  if (!rateLimit.allowed) throw new AppError('RATE_LIMITED', 'Too many roadmap requests', 429)

  const { data: roadmap } = await supabase
    .from('roadmaps')
    .insert({
      user_id: user.id,
      track: data.track,
      level: data.level,
      status: 'pending',
      data: null,
    })
    .select()
    .single()

  const roadmapId = roadmap?.id || `rm_${Date.now()}`

  try {
    await inngest.send({
      name: 'app/roadmap.generate',
      data: { userId: user.id, track: data.track, level: data.level, roadmapId },
    })
  } catch (err) {
    Sentry.captureException(err)
  }

  return { jobId: roadmapId, status: 'pending' }
}

// =====================================================
// Generation Limit Functions
// =====================================================

/**
 * Check if user can generate a new roadmap
 * Limit: 2 roadmaps per month, resets on 1st of each month
 */
export async function checkGenerationLimit(
    userId?: string
): Promise<GenerationLimitStatus> {
    const supabase = await createClient()

    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return {
                canGenerate: false,
                used: 0,
                remaining: 0,
                resetsOn: new Date(),
            }
        }
        userId = user.id
    }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const { data } = await supabase
        .from('roadmap_generation_limits')
        .select('generation_count')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

    const used = data?.generation_count || 0
    const remaining = Math.max(0, 2 - used)
    const canGenerate = used < 2
    const resetsOn = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    return { canGenerate, used, remaining, resetsOn }
}

/**
 * Increment the generation counter for the current month
 */
async function incrementGenerationCount(userId: string): Promise<void> {
    const supabase = await createClient()
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const { data: existing } = await supabase
        .from('roadmap_generation_limits')
        .select('id, generation_count')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

    if (existing) {
        await supabase
            .from('roadmap_generation_limits')
            .update({
                generation_count: existing.generation_count + 1,
                last_generated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('roadmap_generation_limits')
            .insert({
                user_id: userId,
                month_year: currentMonth,
                generation_count: 1,
                last_generated_at: new Date().toISOString(),
            })
    }
}

// =====================================================
// Assessment Requirement Functions
// =====================================================

/**
 * Check if user has completed enough assessments
 */
export async function checkAssessmentRequirement(): Promise<AssessmentRequirementStatus> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            hasEnoughAssessments: false,
            completedCount: 0,
            minimumRequired: 1,
            recommendedCount: 3,
        }
    }

    const { count } = await supabase
        .from('assessment_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('final_score', 'is', null)

    const completedCount = count || 0

    return {
        hasEnoughAssessments: completedCount >= 1,
        completedCount,
        minimumRequired: 1,
        recommendedCount: 3,
    }
}

interface AssessmentSession {
    id: string
    certification_level: string
    final_score: number | null
    completed_at: string
}

/**
 * Analyze user's assessment results to identify weak and strong areas
 */
async function analyzeAssessmentPerformance(
    userId: string
): Promise<{
    weakAreas: string[]
    strongAreas: string[]
    assessmentData: AssessmentSession[]
}> {
    const supabase = await createClient()

    const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('id, certification_level, final_score, completed_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('final_score', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5)

    if (!sessions || sessions.length === 0) {
        return { weakAreas: [], strongAreas: [], assessmentData: [] }
    }

    // Fallback: Use assessment scores to determine weak areas
    const weakAreas: string[] = []
    const strongAreas: string[] = []

    for (const session of sessions) {
        const score = session.final_score || 0
        const level = session.certification_level || 'General'

        if (score < 60) {
            if (!weakAreas.includes(level)) {
                weakAreas.push(level)
            }
        } else if (score > 80) {
            if (!strongAreas.includes(level)) {
                strongAreas.push(level)
            }
        }
    }

    return { weakAreas, strongAreas, assessmentData: sessions as AssessmentSession[] }
}

// =====================================================
// Roadmap Generation
// =====================================================

/**
 * Generate a new AI roadmap for the user
 */
export async function createRoadmap(
    formData: unknown
): Promise<{ success: boolean; roadmapId?: string; error?: string }> {
    try {
        const validated = roadmapFormSchema.parse(formData)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'You must be logged in to generate a roadmap' }
        }

        const limit = await checkGenerationLimit(user.id)
        if (!limit.canGenerate) {
            return {
                success: false,
                error: `Monthly generation limit reached (${limit.used}/2). Resets on ${limit.resetsOn.toLocaleDateString()}`
            }
        }

        const assessmentReq = await checkAssessmentRequirement()
        if (!assessmentReq.hasEnoughAssessments) {
            return {
                success: false,
                error: 'Please complete at least 1 assessment before generating a roadmap'
            }
        }

        const { weakAreas, strongAreas, assessmentData } = await analyzeAssessmentPerformance(user.id)

        console.log('[Roadmap] User:', user.id)
        console.log('[Roadmap] Weak areas:', weakAreas)
        console.log('[Roadmap] Strong areas:', strongAreas)

        const roadmapContent = await callGemini({
            durationDays: validated.durationDays,
            userGoals: validated.learningGoal,
            learningPace: validated.mode === 'advanced' ? validated.learningPace : 'moderate',
            hoursPerDay: validated.hoursPerDay,
            daysPerWeek: validated.daysPerWeek,
            weakAreas,
            strongAreas,
            assessmentScores: assessmentData.slice(0, 3).map((s) => ({
                level: s.certification_level || 'Unknown',
                score: s.final_score || 0,
            })),
            preferredLearningStyle: validated.mode === 'advanced'
                ? validated.learningStyles
                : ['hands-on'],
            currentSkillLevel: validated.skillLevel,
            specificTopics: validated.mode === 'advanced'
                ? validated.specificTopics
                : undefined,
        })

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + validated.durationDays)

        const { data: roadmap, error: insertError } = await supabase
            .from('roadmaps')
            .insert({
                user_id: user.id,
                generation_mode: validated.mode,
                duration_days: validated.durationDays,
                form_responses: validated,
                assessment_data: assessmentData,
                weak_areas: weakAreas,
                strong_areas: strongAreas,
                roadmap_content: roadmapContent,
                is_active: true,
                expires_at: expiresAt.toISOString(),
            })
            .select('id')
            .single()

        if (insertError) {
            console.error('[Roadmap] Database error:', insertError)
            return { success: false, error: 'Failed to save roadmap. Please try again.' }
        }

        await incrementGenerationCount(user.id)

        revalidatePath('/roadmap')
        revalidatePath(`/roadmap/${roadmap.id}`)

        console.log('[Roadmap] Created successfully:', roadmap.id)

        return { success: true, roadmapId: roadmap.id }

    } catch (error) {
        console.error('[Roadmap] Error creating roadmap:', error)

        if (error instanceof Error) {
            return { success: false, error: error.message }
        }

        return { success: false, error: 'An unexpected error occurred' }
    }
}

// =====================================================
// Roadmap Retrieval
// =====================================================

export async function getActiveRoadmap(): Promise<RoadmapRecord | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    return data as RoadmapRecord | null
}

export async function getRoadmapById(
    roadmapId: string
): Promise<RoadmapRecord | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('id', roadmapId)
        .eq('user_id', user.id)
        .single()

    return data as RoadmapRecord | null
}

export async function getRoadmapHistory(): Promise<RoadmapRecord[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (data || []) as RoadmapRecord[]
}

// =====================================================
// Progress Tracking
// =====================================================

export async function updateTaskProgress(
    input: unknown
): Promise<{ success: boolean; error?: string }> {
    try {
        const validated = updateProgressSchema.parse(input)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data: roadmap } = await supabase
            .from('roadmaps')
            .select('id, user_id')
            .eq('id', validated.roadmapId)
            .single()

        if (!roadmap || roadmap.user_id !== user.id) {
            return { success: false, error: 'Roadmap not found' }
        }

        const dayMatch = validated.taskId.match(/d(\d+)/)
        const dayNumber = dayMatch ? parseInt(dayMatch[1]) : 1

        const weekMatch = validated.taskId.match(/w(\d+)/)
        const weekNumber = weekMatch ? parseInt(weekMatch[1]) : null

        const { error } = await supabase
            .from('roadmap_progress')
            .upsert({
                roadmap_id: validated.roadmapId,
                user_id: user.id,
                week_number: weekNumber,
                day_number: dayNumber,
                task_id: validated.taskId,
                completed: validated.completed,
                completed_at: validated.completed ? new Date().toISOString() : null,
            }, {
                onConflict: 'roadmap_id,task_id',
            })

        if (error) {
            console.error('[Progress] Error updating:', error)
            return { success: false, error: 'Failed to update progress' }
        }

        revalidatePath(`/roadmap/${validated.roadmapId}`)

        return { success: true }

    } catch (error) {
        console.error('[Progress] Error:', error)
        return { success: false, error: 'Invalid input' }
    }
}

export async function getRoadmapProgress(
    roadmapId: string
): Promise<Map<string, boolean>> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return new Map()

    const { data } = await supabase
        .from('roadmap_progress')
        .select('task_id, completed')
        .eq('roadmap_id', roadmapId)
        .eq('user_id', user.id)

    const progressMap = new Map<string, boolean>()

    for (const record of data || []) {
        progressMap.set(record.task_id, record.completed)
    }

    return progressMap
}

export async function getRoadmapProgressStats(
    roadmapId: string
): Promise<{
    totalTasks: number
    completedTasks: number
    percentComplete: number
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { totalTasks: 0, completedTasks: 0, percentComplete: 0 }
    }

    const { data: roadmap } = await supabase
        .from('roadmaps')
        .select('roadmap_content')
        .eq('id', roadmapId)
        .eq('user_id', user.id)
        .single()

    if (!roadmap) {
        return { totalTasks: 0, completedTasks: 0, percentComplete: 0 }
    }

    const totalTasks = countTotalTasks(roadmap.roadmap_content)

    const { count } = await supabase
        .from('roadmap_progress')
        .select('id', { count: 'exact', head: true })
        .eq('roadmap_id', roadmapId)
        .eq('user_id', user.id)
        .eq('completed', true)

    const completedTasks = count || 0
    const percentComplete = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0

    return { totalTasks, completedTasks, percentComplete }
}
