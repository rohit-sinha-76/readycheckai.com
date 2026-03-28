/**
 * ReadyCheck AI - Core Type Definitions
 * Phase 5: Comprehensive TypeScript Architecture
 */

// ============================================================================
// ERROR HANDLING TYPES - Result Pattern
// ============================================================================

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
  requestId?: string
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: unknown
}

export interface NetworkError {
  type: 'network' | 'timeout' | 'abort' | 'server'
  message: string
  status?: number
  retryable: boolean
  retryAfter?: number
}

// ============================================================================
// CERTIFICATION TYPES
// ============================================================================

export type CertificationLevelCode = 'RCAF' | 'RCAP' | 'RCGS' | 'RCSA'

export interface CertificationLevel {
  code: CertificationLevelCode
  name: string
  description: string
  questionCount: number
  timeLimit: number // minutes
  passThreshold: number // percentage
  maxAttempts: number
  cooldownDays: number
  prerequisites: CertificationLevelCode[]
  badge: string
  order: number
  isActive: boolean
}

export interface CertificationProgress {
  userId: string
  levelCode: CertificationLevelCode
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'locked'
  attempts: number
  maxAttempts: number
  bestScore: number | null
  lastAttemptAt: string | null
  nextAttemptAt: string | null
  prerequisitesMet: boolean
  subscriptionValid: boolean
  createdAt: string
  updatedAt: string
}

export interface CertificateDetails {
  id: string
  userId: string
  levelCode: CertificationLevelCode
  score: number
  passedAt: string
  expiresAt: string | null
  verificationCode: string
  certificateUrl: string
  isRevoked: boolean
  revokedAt: string | null
  revokedReason: string | null
  metadata: {
    sessionId: string
    timeSpent: number
    questionsAnswered: number
    honorCodeViolations: number
  }
}

export interface AttemptHistory {
  id: string
  userId: string
  levelCode: CertificationLevelCode
  sessionId: string
  score: number
  passed: boolean
  startedAt: string
  completedAt: string
  timeSpent: number // seconds
  questionsAnswered: number
  totalQuestions: number
  honorCodeViolations: HonorCodeViolation[]
  metadata: Record<string, unknown>
}

// ============================================================================
// QUESTION TYPES
// ============================================================================

export type QuestionFormat = 
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'case_study'
  | 'scenario_based'
  | 'drag_drop'
  | 'code_review'

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface Question {
  id: string
  questionKey: string
  questionText: string
  questionFormat: QuestionFormat
  difficulty: QuestionDifficulty
  categoryId: string
  subcategoryId?: string
  tags: string[]
  timeAllocationSeconds: number
  points: number
  complexityScore: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  
  // Question content
  options?: QuestionOption[]
  caseStudyMaterials?: CaseStudyMaterials
  codeSnippet?: string
  mediaUrls?: string[]
  
  // Metadata
  metadata: {
    authorId: string
    reviewerId?: string
    version: number
    lastReviewedAt?: string
    usageCount: number
    averageScore: number
    averageTimeSpent: number
  }
}

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
  explanation?: string
  order: number
}

export interface CaseStudyMaterials {
  title: string
  description: string
  background: string
  documents: Array<{
    title: string
    content: string
    type: 'text' | 'image' | 'chart' | 'code'
    url?: string
  }>
  constraints?: string[]
  objectives: string[]
}

export interface QuestionAnalytics {
  questionId: string
  totalAttempts: number
  correctAttempts: number
  averageTimeSpent: number
  difficultyRating: number
  discriminationIndex: number
  lastAnalyzedAt: string
  trends: {
    period: string
    successRate: number
    averageTime: number
  }[]
}

// Sanitized question type (without correct answers)
export interface SanitizedQuestion extends Omit<Question, 'options'> {
  options?: Array<Omit<QuestionOption, 'isCorrect' | 'explanation'>>
}

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export type AssessmentMode = 'practice' | 'certification'
export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'expired' | 'abandoned'

export interface AssessmentSession {
  id: string
  userId: string
  assessmentType: AssessmentMode
  certificationLevel?: CertificationLevelCode
  certification_level?: CertificationLevelCode // Database alias
  categoryId?: string
  status: AssessmentStatus
  token: string
  fingerprint: string
  
  // Timing
  startedAt: string
  expiresAt: string
  completedAt?: string
  timeLimitMinutes: number
  timeSpentSeconds: number
  time_spent_seconds?: number // Database alias
  
  // Questions and progress
  totalQuestions: number
  total_points?: number // Database alias
  currentQuestionIndex: number
  questionsAnswered: number
  
  // Results
  score?: number
  passed?: boolean
  
  // Security and monitoring
  honorCodeAccepted: boolean
  honorCodeAcceptedAt?: string
  violations: HonorCodeViolation[]
  
  // Metadata
  metadata: {
    userAgent: string
    ipAddress: string
    timezone: string
    screenResolution: string
    autoSaveEnabled: boolean
    lastAutoSaveAt?: string
  }
}

export interface ProgressState {
  sessionId: string
  currentQuestionIndex: number
  answers: Record<string, QuestionAnswer>
  timeSpentPerQuestion: Record<string, number>
  flaggedQuestions: string[]
  lastSavedAt: string
  autoSaveEnabled: boolean
}

export interface QuestionAnswer {
  questionId: string
  selectedOptions: string[]
  textAnswer?: string
  timeSpent: number
  answeredAt: string
  isFlagged: boolean
  confidence?: number
}

export interface SubmissionResult {
  sessionId: string
  score: number
  passed: boolean
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  categoryBreakdown: CategoryScore[]
  detailedFeedback: DetailedFeedback
  certificateId?: string
  nextSteps: NextStep[]
}

export interface CategoryScore {
  categoryId: string
  categoryName: string
  score: number
  maxScore: number
  questionsAnswered: number
  totalQuestions: number
  strengths: string[]
  improvements: string[]
}

export interface DetailedFeedback {
  overallPerformance: string
  strengths: string[]
  areasForImprovement: string[]
  recommendations: Recommendation[]
  studyPlan?: StudyPlan
}

export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  estimatedTime: string
  resources: Resource[]
}

export interface Resource {
  title: string
  type: 'article' | 'video' | 'course' | 'book' | 'practice'
  url: string
  description: string
  difficulty: QuestionDifficulty
}

export interface StudyPlan {
  title: string
  description: string
  estimatedDuration: string
  phases: StudyPhase[]
}

export interface StudyPhase {
  title: string
  description: string
  duration: string
  objectives: string[]
  resources: Resource[]
  milestones: string[]
}

export interface NextStep {
  type: 'retake' | 'upgrade' | 'practice' | 'study' | 'certificate'
  title: string
  description: string
  actionUrl: string
  priority: number
}

// ============================================================================
// HONOR CODE AND SECURITY TYPES
// ============================================================================

export type HonorCodeViolationType = 
  | 'tab_switch'
  | 'window_blur'
  | 'copy_paste'
  | 'right_click'
  | 'dev_tools'
  | 'screenshot'
  | 'multiple_sessions'
  | 'suspicious_timing'
  | 'pattern_recognition'

export interface HonorCodeViolation {
  id: string
  sessionId: string
  type: HonorCodeViolationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  details: Record<string, unknown>
  questionIndex?: number
  automaticAction?: 'warning' | 'flag' | 'terminate'
}

export interface HonorCodeStatus {
  userId: string
  totalViolations: number
  severityBreakdown: Record<string, number>
  lastViolationAt?: string
  warningsIssued: number
  assessmentsTerminated: number
  accountStatus: 'good' | 'warning' | 'restricted' | 'banned'
  restrictionExpiresAt?: string
}

// ============================================================================
// USER AND PROFILE TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
export type AccountStatus = 'active' | 'suspended' | 'banned' | 'pending_verification'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  firstName: string
  lastName: string
  avatarUrl?: string
  timezone: string
  locale: string
  
  // Account status
  accountStatus: AccountStatus
  emailVerified: boolean
  phoneVerified: boolean
  
  // Professional info
  jobTitle?: string
  company?: string
  industry?: string
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  
  // Preferences
  preferences: UserPreferences
  
  // Timestamps
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  lastActiveAt?: string
}

export interface UserPreferences {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    marketing: boolean
  }
  assessment: {
    autoSave: boolean
    showTimer: boolean
    confirmBeforeSubmit: boolean
    flaggedQuestionReminder: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'connections'
    shareProgress: boolean
    allowAnalytics: boolean
  }
  accessibility: {
    highContrast: boolean
    largeText: boolean
    screenReader: boolean
    keyboardNavigation: boolean
  }
}

export interface SubscriptionDetails {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt?: string
  trialStart?: string
  trialEnd?: string
  
  // Payment info
  paymentMethodId?: string
  lastPaymentAt?: string
  nextPaymentAt?: string
  
  // Features
  features: SubscriptionFeatures
  
  // Usage tracking
  usage: SubscriptionUsage
}

export interface SubscriptionFeatures {
  maxCertificationAttempts: number
  accessToPremiumContent: boolean
  detailedAnalytics: boolean
  prioritySupport: boolean
  teamManagement: boolean
  customBranding: boolean
  apiAccess: boolean
  exportData: boolean
}

export interface SubscriptionUsage {
  certificationAttempts: number
  assessmentsSessions: number
  apiCalls: number
  storageUsed: number
  teamMembers: number
  resetDate: string
}

export interface UserAnalytics {
  userId: string
  totalAssessments: number
  totalCertifications: number
  averageScore: number
  timeSpent: number
  streakDays: number
  lastActivityAt: string
  
  // Performance trends
  performanceTrends: PerformanceTrend[]
  categoryStrengths: CategoryStrength[]
  learningPath: LearningPathProgress[]
  
  // Engagement metrics
  sessionDuration: number
  returnRate: number
  completionRate: number
}

export interface PerformanceTrend {
  period: string
  averageScore: number
  assessmentsCompleted: number
  timeSpent: number
  improvement: number
}

export interface CategoryStrength {
  categoryId: string
  categoryName: string
  proficiencyLevel: number
  assessmentsTaken: number
  averageScore: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface LearningPathProgress {
  pathId: string
  pathName: string
  progress: number
  startedAt: string
  estimatedCompletion: string
  currentPhase: string
}

const coreTypes = {}

export default coreTypes
