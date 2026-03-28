/**
 * Zod validation schemas for AI Roadmap Generation
 * 
 * These schemas validate user input for roadmap generation forms
 * Used in both client-side form validation and server-side API validation
 */

import { z } from 'zod'

// =====================================================
// Duration Options
// =====================================================

/**
 * Valid duration options for roadmap (in days)
 * Users can select: 1 week, 2 weeks, 3 weeks, 1 month, 2 months, or 3 months
 */
export const ROADMAP_DURATION_OPTIONS = [7, 14, 21, 30, 60, 90] as const
export type RoadmapDuration = typeof ROADMAP_DURATION_OPTIONS[number]

// =====================================================
// Quick Mode Schema (4-5 questions)
// =====================================================

/**
 * Quick mode: Essential questions for fast roadmap generation
 * Takes ~1 minute to complete
 */
export const quickModeSchema = z.object({
    mode: z.literal('quick'),

    // How long should the roadmap be?
    durationDays: z
        .number()
        .int()
        .min(7, 'Minimum duration is 7 days')
        .max(90, 'Maximum duration is 90 days'),

    // What do you want to learn?
    learningGoal: z
        .string()
        .min(10, 'Please describe your learning goal in at least 10 characters')
        .max(500, 'Learning goal is too long (max 500 characters)'),

    // What's your current skill level?
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
        required_error: 'Please select your skill level',
    }),

    // How many hours can you dedicate per day?
    hoursPerDay: z
        .number()
        .min(0.5, 'Minimum is 30 minutes per day')
        .max(8, 'Maximum is 8 hours per day'),

    // How many days per week can you study?
    daysPerWeek: z
        .number()
        .int()
        .min(1, 'Minimum is 1 day per week')
        .max(7, 'Maximum is 7 days per week'),
})

// =====================================================
// Advanced Mode Schema (8-10 questions)
// =====================================================

/**
 * Advanced mode: Detailed questions for highly personalized roadmap
 * Takes ~3 minutes to complete
 */
export const advancedModeSchema = quickModeSchema.extend({
    mode: z.literal('advanced'),

    // How fast do you want to learn?
    learningPace: z.enum(['fast', 'moderate', 'relaxed'], {
        required_error: 'Please select your learning pace',
    }),

    // How do you prefer to learn?
    learningStyles: z
        .array(z.enum(['video', 'reading', 'hands-on']))
        .min(1, 'Please select at least one learning style'),

    // Any specific topics to focus on?
    specificTopics: z
        .array(z.string().max(100))
        .max(5, 'Maximum 5 specific topics')
        .optional(),

    // What's your career goal?
    careerGoal: z.enum(['job_ready', 'freelancing', 'hobby', 'promotion'], {
        required_error: 'Please select your career goal',
    }),

    // Tell us about your prior experience
    priorExperience: z
        .string()
        .max(1000, 'Prior experience description is too long')
        .optional(),

    // What's your budget for learning resources?
    budgetPreference: z.enum(['free_only', 'budget_friendly', 'no_limit'], {
        required_error: 'Please select your budget preference',
    }),
})

// =====================================================
// Combined Schema with Discriminated Union
// =====================================================

/**
 * Combined schema that validates either quick or advanced mode
 * Uses discriminated union based on 'mode' field
 */
export const roadmapFormSchema = z.discriminatedUnion('mode', [
    quickModeSchema,
    advancedModeSchema,
])

// Type inference from schemas
export type QuickModeFormData = z.infer<typeof quickModeSchema>
export type AdvancedModeFormData = z.infer<typeof advancedModeSchema>
export type RoadmapFormData = z.infer<typeof roadmapFormSchema>

// =====================================================
// Progress Update Schema
// =====================================================

/**
 * Schema for updating task completion status
 */
export const updateProgressSchema = z.object({
    roadmapId: z.string().uuid('Invalid roadmap ID'),
    taskId: z.string().min(1, 'Task ID is required').max(50, 'Task ID is too long'),
    completed: z.boolean(),
})

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>

// =====================================================
// Generation Limit Check Schema
// =====================================================

/**
 * Schema for checking generation limits
 */
export const checkLimitSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
})

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get human-readable duration label
 */
export function getDurationLabel(days: number): string {
    switch (days) {
        case 7: return '1 Week'
        case 14: return '2 Weeks'
        case 21: return '3 Weeks'
        case 30: return '1 Month'
        case 60: return '2 Months'
        case 90: return '3 Months'
        default: return `${days} Days`
    }
}

/**
 * Get skill level description
 */
export function getSkillLevelDescription(level: string): string {
    switch (level) {
        case 'beginner':
            return 'New to AI concepts, little to no prior experience'
        case 'intermediate':
            return 'Familiar with basics, some hands-on experience'
        case 'advanced':
            return 'Strong foundation, ready for advanced topics'
        default:
            return ''
    }
}

/**
 * Get learning pace description
 */
export function getLearningPaceDescription(pace: string): string {
    switch (pace) {
        case 'fast':
            return 'Intensive learning, cover more ground quickly'
        case 'moderate':
            return 'Balanced pace, steady progress with time for practice'
        case 'relaxed':
            return 'Take your time, focus on deep understanding'
        default:
            return ''
    }
}
