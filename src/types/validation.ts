/**
 * ReadyCheck AI - Zod Validation Schemas
 * Phase 5: Comprehensive TypeScript Architecture
 */

import { z } from 'zod'

// ============================================================================
// BASE VALIDATION SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid()
export const EmailSchema = z.string().email()
export const URLSchema = z.string().url()
export const DateTimeSchema = z.string().datetime()
export const PositiveIntSchema = z.number().int().positive()
export const NonNegativeIntSchema = z.number().int().min(0)

// ============================================================================
// USER VALIDATION SCHEMAS
// ============================================================================

export const UserProfileSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  fullName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  avatarUrl: URLSchema.optional(),
  timezone: z.string().min(1).max(50),
  locale: z.string().min(2).max(10),
  accountStatus: z.enum(['active', 'suspended', 'banned', 'pending_verification']),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().max(50).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  preferences: z.object({
    notifications: z.record(z.boolean()),
    assessment: z.record(z.boolean()),
    privacy: z.record(z.union([z.boolean(), z.string()])),
    accessibility: z.record(z.boolean())
  }),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  lastLoginAt: DateTimeSchema.optional(),
  lastActiveAt: DateTimeSchema.optional()
})

export const UpdateUserProfileSchema = UserProfileSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const SubscriptionDetailsSchema = z.object({
  status: z.enum(['active', 'past_due', 'canceled', 'incomplete', 'trialing']),
  tier: z.enum(['free', 'pro', 'enterprise']),
  expiresAt: DateTimeSchema.optional(),
  features: z.array(z.string()),
  limits: z.object({
    assessmentsPerMonth: PositiveIntSchema,
    certificationsPerYear: PositiveIntSchema,
    teamMembers: PositiveIntSchema,
    storageGB: PositiveIntSchema
  }),
  billing: z.object({
    amount: PositiveIntSchema,
    currency: z.string().length(3),
    interval: z.enum(['month', 'year']),
    nextBillingDate: DateTimeSchema.optional()
  }).optional()
})

// ============================================================================
// ASSESSMENT VALIDATION SCHEMAS
// ============================================================================

export const AssessmentModeSchema = z.enum(['practice', 'certification'])
export const CertificationLevelSchema = z.enum(['RCAF', 'RCAP', 'RCGS', 'RCSA'])
export const AssessmentStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'expired', 'abandoned'])

export const QuestionAnswerSchema = z.object({
  questionId: UUIDSchema,
  selectedOptions: z.array(z.string()),
  textAnswer: z.string().optional(),
  timeSpent: NonNegativeIntSchema,
  answeredAt: DateTimeSchema,
  isFlagged: z.boolean(),
  confidence: z.number().min(0).max(100).optional()
})

export const AssessmentSessionSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  assessmentType: AssessmentModeSchema,
  certificationLevel: CertificationLevelSchema.optional(),
  categoryId: UUIDSchema.optional(),
  status: AssessmentStatusSchema,
  token: z.string().min(1),
  fingerprint: z.string().min(1),
  startedAt: DateTimeSchema,
  expiresAt: DateTimeSchema,
  completedAt: DateTimeSchema.optional(),
  timeLimitMinutes: PositiveIntSchema,
  timeSpentSeconds: NonNegativeIntSchema,
  totalQuestions: PositiveIntSchema,
  currentQuestionIndex: NonNegativeIntSchema,
  questionsAnswered: NonNegativeIntSchema,
  score: z.number().min(0).max(100).optional(),
  passed: z.boolean().optional(),
  honorCodeAccepted: z.boolean(),
  honorCodeAcceptedAt: DateTimeSchema.optional(),
  violations: z.array(z.object({
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
    timestamp: DateTimeSchema,
    details: z.record(z.unknown()),
    questionIndex: NonNegativeIntSchema.optional()
  })),
  metadata: z.record(z.unknown())
})

export const CreateAssessmentSessionSchema = z.object({
  assessmentType: AssessmentModeSchema,
  certificationLevel: CertificationLevelSchema.optional(),
  categoryId: UUIDSchema.optional(),
  fingerprint: z.string().min(1),
  honorCodeAccepted: z.boolean(),
  timezone: z.string(),
  userAgent: z.string()
})

// ============================================================================
// QUESTION VALIDATION SCHEMAS
// ============================================================================

export const QuestionFormatSchema = z.enum([
  'multiple_choice',
  'multiple_select',
  'true_false',
  'case_study',
  'scenario_based',
  'drag_drop',
  'code_review'
])

export const DifficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert'])

export const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  order: NonNegativeIntSchema,
  isCorrect: z.boolean().optional()
})

export const CaseStudyMaterialSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  documents: z.array(z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    type: z.enum(['text', 'code', 'diagram', 'table'])
  }))
})

export const QuestionSchema = z.object({
  id: UUIDSchema,
  questionKey: z.string().min(1),
  questionText: z.string().min(1),
  questionFormat: QuestionFormatSchema,
  difficulty: DifficultyLevelSchema,
  categoryId: UUIDSchema,
  subcategoryId: UUIDSchema.optional(),
  tags: z.array(z.string()),
  timeAllocationSeconds: PositiveIntSchema,
  points: PositiveIntSchema,
  complexityScore: z.number().min(1).max(10),
  isActive: z.boolean(),
  questionType: z.enum(['practice', 'certification', 'both']),
  certificationLevels: z.array(CertificationLevelSchema),
  options: z.array(QuestionOptionSchema).optional(),
  correctAnswerIndex: NonNegativeIntSchema.optional(),
  correctAnswerText: z.string().optional(),
  explanation: z.string().optional(),
  caseStudyMaterials: CaseStudyMaterialSchema.optional(),
  codeSnippet: z.string().optional(),
  mediaUrls: z.array(URLSchema),
  metadata: z.record(z.unknown()),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  createdBy: UUIDSchema,
  reviewedBy: UUIDSchema.optional(),
  lastReviewedAt: DateTimeSchema.optional()
})

export const SanitizedQuestionSchema = QuestionSchema.omit({
  correctAnswerIndex: true,
  correctAnswerText: true
}).extend({
  options: z.array(QuestionOptionSchema.omit({ isCorrect: true })).optional()
})

// ============================================================================
// CERTIFICATION VALIDATION SCHEMAS
// ============================================================================

export const CertificationProgressSchema = z.object({
  levelCode: CertificationLevelSchema,
  levelName: z.string().min(1),
  description: z.string(),
  prerequisites: z.array(CertificationLevelSchema),
  subscriptionRequired: z.enum(['free', 'pro', 'enterprise']),
  status: z.enum(['locked', 'available', 'in_progress', 'passed', 'failed']),
  attempts: NonNegativeIntSchema,
  maxAttempts: PositiveIntSchema,
  bestScore: z.number().min(0).max(100).optional(),
  lastAttemptAt: DateTimeSchema.optional(),
  nextAttemptAt: DateTimeSchema.optional(),
  cooldownHours: NonNegativeIntSchema,
  passingScore: z.number().min(0).max(100),
  timeLimitMinutes: PositiveIntSchema,
  totalQuestions: PositiveIntSchema,
  questionCategories: z.array(z.object({
    categoryId: UUIDSchema,
    categoryName: z.string(),
    questionCount: PositiveIntSchema,
    weight: z.number().min(0).max(1)
  }))
})

export const CertificateDetailsSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  certificationLevel: CertificationLevelSchema,
  sessionId: UUIDSchema,
  score: z.number().min(0).max(100),
  passedAt: DateTimeSchema,
  expiresAt: DateTimeSchema.optional(),
  verificationCode: z.string().min(1),
  certificateUrl: URLSchema.optional(),
  isRevoked: z.boolean(),
  revokedAt: DateTimeSchema.optional(),
  revokedReason: z.string().optional(),
  metadata: z.record(z.unknown())
})

// ============================================================================
// API REQUEST/RESPONSE VALIDATION SCHEMAS
// ============================================================================

export const StartAssessmentRequestSchema = z.object({
  assessmentType: AssessmentModeSchema,
  certificationLevel: CertificationLevelSchema.optional(),
  categoryId: UUIDSchema.optional(),
  fingerprint: z.string().min(1),
  honorCodeAccepted: z.boolean(),
  timezone: z.string(),
  userAgent: z.string()
})

export const StartAssessmentResponseSchema = z.object({
  sessionId: UUIDSchema,
  token: z.string().min(1),
  expiresAt: DateTimeSchema,
  totalQuestions: PositiveIntSchema,
  timeLimitMinutes: PositiveIntSchema,
  instructions: z.array(z.string()),
  firstQuestionId: UUIDSchema
})

export const SubmitAnswerRequestSchema = z.object({
  sessionId: UUIDSchema,
  token: z.string().min(1),
  questionId: UUIDSchema,
  answer: QuestionAnswerSchema,
  autoSave: z.boolean().optional()
})

export const SubmitAnswerResponseSchema = z.object({
  success: z.boolean(),
  nextQuestionId: UUIDSchema.optional(),
  isComplete: z.boolean(),
  timeRemaining: NonNegativeIntSchema,
  questionsAnswered: NonNegativeIntSchema,
  totalQuestions: PositiveIntSchema
})

export const CompleteAssessmentRequestSchema = z.object({
  sessionId: UUIDSchema,
  token: z.string().min(1),
  finalAnswers: z.record(QuestionAnswerSchema),
  honorCodeViolations: z.array(z.object({
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
    timestamp: DateTimeSchema,
    details: z.record(z.unknown()),
    questionIndex: NonNegativeIntSchema.optional()
  }))
})

export const CompleteAssessmentResponseSchema = z.object({
  sessionId: UUIDSchema,
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  totalQuestions: PositiveIntSchema,
  correctAnswers: NonNegativeIntSchema,
  timeSpent: NonNegativeIntSchema,
  certificateId: UUIDSchema.optional(),
  resultsUrl: URLSchema
})

// ============================================================================
// ERROR VALIDATION SCHEMAS
// ============================================================================

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  timestamp: DateTimeSchema,
  requestId: z.string().optional(),
  path: z.string().optional()
})

export const ValidationErrorSchema = z.object({
  field: z.string().min(1),
  code: z.string().min(1),
  message: z.string().min(1),
  value: z.unknown().optional()
})

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
    metadata: z.object({
      timestamp: DateTimeSchema,
      requestId: z.string(),
      processingTime: NonNegativeIntSchema,
      version: z.string()
    })
  })

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  ApiResponseSchema(z.array(itemSchema)).extend({
    pagination: z.object({
      page: PositiveIntSchema,
      limit: PositiveIntSchema,
      total: NonNegativeIntSchema,
      totalPages: NonNegativeIntSchema,
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  })

// ============================================================================
// HONOR CODE VALIDATION SCHEMAS
// ============================================================================

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
  timestamp: DateTimeSchema,
  details: z.record(z.unknown()),
  questionIndex: NonNegativeIntSchema.optional()
})

export const HonorCodeStatusSchema = z.object({
  userId: UUIDSchema,
  sessionId: UUIDSchema,
  status: z.enum(['clean', 'warning', 'violated', 'terminated']),
  violationCount: NonNegativeIntSchema,
  violations: z.array(HonorCodeViolationSchema),
  lastViolationAt: DateTimeSchema.optional(),
  warningsIssued: NonNegativeIntSchema,
  automaticActions: z.array(z.object({
    action: z.enum(['warning', 'flag', 'terminate']),
    reason: z.string(),
    timestamp: DateTimeSchema
  }))
})

// ============================================================================
// ANALYTICS VALIDATION SCHEMAS
// ============================================================================

export const UserAnalyticsSchema = z.object({
  userId: UUIDSchema,
  period: z.enum(['week', 'month', 'quarter', 'year']),
  summary: z.object({
    totalAssessments: NonNegativeIntSchema,
    averageScore: z.number().min(0).max(100),
    timeSpent: NonNegativeIntSchema,
    certificationsEarned: NonNegativeIntSchema
  }),
  trends: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    score: z.number().min(0).max(100),
    timeSpent: NonNegativeIntSchema
  })),
  categoryBreakdown: z.array(z.object({
    categoryId: UUIDSchema,
    categoryName: z.string(),
    averageScore: z.number().min(0).max(100),
    assessmentCount: NonNegativeIntSchema
  }))
})

export const QuestionAnalyticsSchema = z.object({
  questionId: UUIDSchema,
  totalAttempts: NonNegativeIntSchema,
  correctAttempts: NonNegativeIntSchema,
  successRate: z.number().min(0).max(1),
  averageTimeSpent: NonNegativeIntSchema,
  difficultyRating: z.number().min(1).max(10),
  lastAnalyzedAt: DateTimeSchema
})

// ============================================================================
// UTILITY VALIDATION FUNCTIONS
// ============================================================================

export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodError
} {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): data is T => {
    try {
      schema.parse(data)
      return true
    } catch {
      return false
    }
  }
}

export function formatValidationErrors(errors: z.ZodError): z.infer<typeof ValidationErrorSchema>[] {
  return errors.errors.map(error => ({
    field: error.path.join('.'),
    code: error.code,
    message: error.message,
    value: error.path.length > 0 ? error : undefined
  }))
}

// ============================================================================
// RUNTIME TYPE GUARDS
// ============================================================================

export const isValidUUID = createValidator(UUIDSchema)
export const isValidEmail = createValidator(EmailSchema)
export const isValidURL = createValidator(URLSchema)
export const isValidDateTime = createValidator(DateTimeSchema)
export const isValidUserProfile = createValidator(UserProfileSchema)
export const isValidAssessmentSession = createValidator(AssessmentSessionSchema)
export const isValidQuestion = createValidator(QuestionSchema)
export const isValidSanitizedQuestion = createValidator(SanitizedQuestionSchema)
export const isValidCertificateDetails = createValidator(CertificateDetailsSchema)
export const isValidHonorCodeViolation = createValidator(HonorCodeViolationSchema)
export const isValidApiError = createValidator(ApiErrorSchema)

const validationExports = {
  // Schemas
  UUIDSchema,
  EmailSchema,
  URLSchema,
  DateTimeSchema,
  UserProfileSchema,
  AssessmentSessionSchema,
  QuestionSchema,
  SanitizedQuestionSchema,
  CertificateDetailsSchema,
  HonorCodeViolationSchema,
  ApiErrorSchema,
  
  // Validators
  validateWithSchema,
  createValidator,
  formatValidationErrors,
  
  // Type guards
  isValidUUID,
  isValidEmail,
  isValidURL,
  isValidDateTime,
  isValidUserProfile,
  isValidAssessmentSession,
  isValidQuestion,
  isValidSanitizedQuestion,
  isValidCertificateDetails,
  isValidHonorCodeViolation,
  isValidApiError
}

export default validationExports
