/**
 * Assessment API Validation Schemas
 * Zod schemas for universal schema assessment endpoints
 */

import { z } from 'zod'

// Certification levels enum
export const CertificationLevel = z.enum(['rcaf', 'rcap', 'rcgs', 'rcsa'])

// Assessment start request schema
export const StartAssessmentSchema = z.object({
  level: CertificationLevel,
  count: z.number().min(5).max(50).default(25),
  category: z.string().optional(),
  mode: z.enum(['practice', 'certification']).default('practice')
})

// Submit answer request schema
export const SubmitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  question_key: z.string(),
  selected_option_id: z.string(),
  elapsed_ms: z.number().min(0)
})

// Finalize assessment request schema
export const FinalizeAssessmentSchema = z.object({
  sessionId: z.string().uuid()
})

// Get results query schema
export const GetResultsSchema = z.object({
  sessionId: z.string().uuid()
})

// Question response type (no answers exposed)
export const QuestionResponseSchema = z.object({
  key: z.string(),
  text: z.string(),
  format: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string()
  })),
  points: z.number(),
  timeRecommended: z.number().optional()
})

// Assessment session response schema
export const AssessmentSessionSchema = z.object({
  sessionId: z.string().uuid(),
  level: CertificationLevel,
  mode: z.enum(['practice', 'certification']),
  perQuestionSeconds: z.number(),
  overallSeconds: z.number(),
  questions: z.array(QuestionResponseSchema),
  totalQuestions: z.number(),
  expiresAt: z.string()
})

// Assessment result schema
export const AssessmentResultSchema = z.object({
  sessionId: z.string().uuid(),
  level: CertificationLevel,
  total: z.number(),
  correct: z.number(),
  score: z.number(),
  passed: z.boolean(),
  completedAt: z.string(),
  breakdownByCategory: z.array(z.object({
    category: z.string(),
    correct: z.number(),
    total: z.number()
  }))
})

// Type exports
export type StartAssessmentRequest = z.infer<typeof StartAssessmentSchema>
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerSchema>
export type FinalizeAssessmentRequest = z.infer<typeof FinalizeAssessmentSchema>
export type GetResultsRequest = z.infer<typeof GetResultsSchema>
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>
export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>
