/**
 * ReadyCheck AI - API Security and Validation Types
 * Phase 5: Comprehensive TypeScript Architecture
 */

import { z } from 'zod'
import type { 
  AssessmentMode, 
  CertificationLevelCode, 
  QuestionAnswer, 
  HonorCodeViolation,
  ApiError,
  ValidationError,
  Result
} from './core'

// ============================================================================
// JWT AND AUTHENTICATION TYPES
// ============================================================================

export interface JWTPayload {
  sub: string // user ID
  email: string
  role: 'user' | 'admin' | 'moderator'
  subscription_tier: 'free' | 'pro' | 'enterprise'
  account_status: 'active' | 'suspended' | 'banned'
  iat: number
  exp: number
  aud: string
  iss: string
}

export interface SessionToken {
  token: string
  userId: string
  sessionId: string
  expiresAt: string
  fingerprint: string
  permissions: SessionPermissions
}

export interface SessionPermissions {
  canTakeAssessment: boolean
  canAccessCertification: boolean
  canViewResults: boolean
  canExportData: boolean
  maxConcurrentSessions: number
}

// ============================================================================
// REQUEST/RESPONSE VALIDATION TYPES
// ============================================================================

export interface ApiRequest<T = unknown> {
  data: T
  headers: Record<string, string>
  timestamp: string
  requestId: string
  fingerprint?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  metadata: {
    timestamp: string
    requestId: string
    processingTime: number
    version: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ============================================================================
// ASSESSMENT API TYPES
// ============================================================================

export interface StartAssessmentRequest {
  assessmentType: AssessmentMode
  certificationLevel?: CertificationLevelCode
  categoryId?: string
  fingerprint: string
  honorCodeAccepted: boolean
  timezone: string
  userAgent: string
}

export interface StartAssessmentResponse {
  sessionId: string
  token: string
  expiresAt: string
  totalQuestions: number
  timeLimitMinutes: number
  instructions: string[]
  firstQuestionId: string
}

export interface GetQuestionRequest {
  sessionId: string
  token: string
  questionIndex: number
}

export interface GetQuestionResponse {
  questionId: string
  questionText: string
  questionFormat: string
  options?: Array<{
    id: string
    text: string
    order: number
  }>
  timeAllocation: number
  points: number
  currentIndex: number
  totalQuestions: number
  caseStudyMaterials?: {
    title: string
    description: string
    documents: Array<{
      title: string
      content: string
      type: string
    }>
  }
}

export interface SubmitAnswerRequest {
  sessionId: string
  token: string
  questionId: string
  answer: QuestionAnswer
  autoSave?: boolean
}

export interface SubmitAnswerResponse {
  success: boolean
  nextQuestionId?: string
  isComplete: boolean
  timeRemaining: number
  questionsAnswered: number
  totalQuestions: number
}

export interface CompleteAssessmentRequest {
  sessionId: string
  token: string
  finalAnswers: Record<string, QuestionAnswer>
  honorCodeViolations: HonorCodeViolation[]
}

export interface CompleteAssessmentResponse {
  sessionId: string
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  certificateId?: string
  resultsUrl: string
}

// ============================================================================
// USER MANAGEMENT API TYPES
// ============================================================================

export interface UpdateProfileRequest {
  fullName?: string
  jobTitle?: string
  company?: string
  industry?: string
  experienceLevel?: string
  preferences?: Partial<{
    notifications: Record<string, boolean>
    assessment: Record<string, boolean>
    privacy: Record<string, boolean | string>
    accessibility: Record<string, boolean>
  }>
}

export interface UpdateProfileResponse {
  userId: string
  updatedFields: string[]
  updatedAt: string
}

export interface GetUserAnalyticsRequest {
  userId: string
  period?: 'week' | 'month' | 'quarter' | 'year'
  includeDetails?: boolean
}

export interface GetUserAnalyticsResponse {
  userId: string
  period: string
  summary: {
    totalAssessments: number
    averageScore: number
    timeSpent: number
    certificationsEarned: number
  }
  trends: Array<{
    date: string
    score: number
    timeSpent: number
  }>
  categoryBreakdown: Array<{
    categoryId: string
    categoryName: string
    averageScore: number
    assessmentCount: number
  }>
}

// ============================================================================
// CERTIFICATION API TYPES
// ============================================================================

export interface GetCertificationProgressRequest {
  userId: string
  levelCode?: CertificationLevelCode
}

export interface GetCertificationProgressResponse {
  userId: string
  levels: Array<{
    code: CertificationLevelCode
    name: string
    status: 'locked' | 'available' | 'in_progress' | 'passed' | 'failed'
    attempts: number
    maxAttempts: number
    bestScore?: number
    nextAttemptAt?: string
    prerequisitesMet: boolean
  }>
}

export interface VerifyCertificateRequest {
  verificationCode: string
}

export interface VerifyCertificateResponse {
  isValid: boolean
  certificate?: {
    id: string
    holderName: string
    levelCode: CertificationLevelCode
    levelName: string
    issuedAt: string
    expiresAt?: string
    score: number
    verificationUrl: string
  }
  error?: string
}

// ============================================================================
// ADMIN API TYPES
// ============================================================================

export interface AdminDashboardRequest {
  period?: 'day' | 'week' | 'month'
  includeDetails?: boolean
}

export interface AdminDashboardResponse {
  summary: {
    totalUsers: number
    activeUsers: number
    totalAssessments: number
    certificationsIssued: number
    averageScore: number
  }
  trends: {
    userRegistrations: Array<{ date: string; count: number }>
    assessmentCompletions: Array<{ date: string; count: number }>
    certificationCompletions: Array<{ date: string; count: number }>
  }
  alerts: Array<{
    type: 'security' | 'performance' | 'system'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: string
  }>
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const StartAssessmentSchema = z.object({
  assessmentType: z.enum(['practice', 'certification']),
  certificationLevel: z.enum(['RCAF', 'RCAP', 'RCGS', 'RCSA']).optional(),
  categoryId: z.string().uuid().optional(),
  fingerprint: z.string().min(1),
  honorCodeAccepted: z.boolean(),
  timezone: z.string(),
  userAgent: z.string()
})

export const SubmitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().min(1),
  questionId: z.string().uuid(),
  answer: z.object({
    questionId: z.string().uuid(),
    selectedOptions: z.array(z.string()),
    textAnswer: z.string().optional(),
    timeSpent: z.number().min(0),
    answeredAt: z.string().datetime(),
    isFlagged: z.boolean(),
    confidence: z.number().min(0).max(100).optional()
  }),
  autoSave: z.boolean().optional()
})

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().max(50).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  preferences: z.object({
    notifications: z.record(z.boolean()).optional(),
    assessment: z.record(z.boolean()).optional(),
    privacy: z.record(z.union([z.boolean(), z.string()])).optional(),
    accessibility: z.record(z.boolean()).optional()
  }).optional()
})

export const HonorCodeViolationSchema = z.object({
  type: z.enum([
    'tab_switch',
    'window_blur', 
    'copy_paste',
    'right_click',
    'dev_tools',
    'screenshot',
    'multiple_sessions',
    'suspicious_timing',
    'pattern_recognition'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.string().datetime(),
  details: z.record(z.unknown()),
  questionIndex: z.number().optional()
})

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

export interface AuthenticationError extends ApiError {
  code: 'AUTH_REQUIRED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'INSUFFICIENT_PERMISSIONS'
}

export interface ValidationErrorResponse extends ApiError {
  code: 'VALIDATION_ERROR'
  details: {
    fieldErrors: ValidationError[]
    invalidFields: string[]
  }
}

export interface RateLimitError extends ApiError {
  code: 'RATE_LIMIT_EXCEEDED'
  details: {
    limit: number
    remaining: number
    resetTime: string
    retryAfter: number
  }
}

export interface AssessmentError extends ApiError {
  code: 
    | 'SESSION_NOT_FOUND'
    | 'SESSION_EXPIRED' 
    | 'SESSION_COMPLETED'
    | 'INVALID_QUESTION'
    | 'HONOR_CODE_VIOLATION'
    | 'MAX_ATTEMPTS_EXCEEDED'
    | 'PREREQUISITES_NOT_MET'
    | 'SUBSCRIPTION_REQUIRED'
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  )
}

export function isValidationError(error: unknown): error is ValidationErrorResponse {
  return isApiError(error) && error.code === 'VALIDATION_ERROR'
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return (
    isApiError(error) && 
    ['AUTH_REQUIRED', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'INSUFFICIENT_PERMISSIONS'].includes(error.code)
  )
}

export function createApiResponse<T>(
  data: T,
  requestId: string,
  processingTime: number
): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
      processingTime,
      version: '1.0.0'
    }
  }
}

export function createErrorResponse(
  error: ApiError,
  requestId: string,
  processingTime: number
): ApiResponse<never> {
  return {
    success: false,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
      processingTime,
      version: '1.0.0'
    }
  }
}

// ============================================================================
// RESULT PATTERN UTILITIES
// ============================================================================

export function success<T>(data: T): Result<T> {
  return { success: true, data }
}

export function failure<E = ApiError>(error: E): Result<never, E> {
  return { success: false, error }
}

export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

const apiTypes = {}

export default apiTypes
