/**
 * ReadyCheck AI - Supabase Integration Types
 * Phase 5: Comprehensive TypeScript Architecture
 */

import type { Database } from './database'
import type { 
  UserProfile,
  AssessmentSession,
  Question,
  CertificateDetails,
  CertificationProgress,
  HonorCodeViolation,
  Result
} from './core'

// ============================================================================
// SUPABASE DATABASE TYPES
// ============================================================================

export type Tables = Database['public']['Tables']
export type Views = Database['public']['Views']
export type Functions = Database['public']['Functions']
export type Enums = Database['public']['Enums']

// Table row types
export type UserRow = Tables['users']['Row']
export type UserInsert = Tables['users']['Insert']
export type UserUpdate = Tables['users']['Update']

export type AssessmentSessionRow = Tables['assessment_sessions']['Row']
export type AssessmentSessionInsert = Tables['assessment_sessions']['Insert']
export type AssessmentSessionUpdate = Tables['assessment_sessions']['Update']

export type QuestionRow = Tables['questions']['Row']
export type QuestionInsert = Tables['questions']['Insert']
export type QuestionUpdate = Tables['questions']['Update']

export type CertificateRow = Tables['user_certificates']['Row']
export type CertificateInsert = Tables['user_certificates']['Insert']
export type CertificateUpdate = Tables['user_certificates']['Update']

export type CategoryRow = Tables['assessment_categories']['Row']
export type CategoryInsert = Tables['assessment_categories']['Insert']
export type CategoryUpdate = Tables['assessment_categories']['Update']

// ============================================================================
// TYPE-SAFE QUERY BUILDERS
// ============================================================================

export interface QueryBuilder<T> {
  select(columns?: string): QueryBuilder<T>
  insert(data: Partial<T>): QueryBuilder<T>
  update(data: Partial<T>): QueryBuilder<T>
  delete(): QueryBuilder<T>
  eq(column: keyof T, value: unknown): QueryBuilder<T>
  neq(column: keyof T, value: unknown): QueryBuilder<T>
  gt(column: keyof T, value: unknown): QueryBuilder<T>
  gte(column: keyof T, value: unknown): QueryBuilder<T>
  lt(column: keyof T, value: unknown): QueryBuilder<T>
  lte(column: keyof T, value: unknown): QueryBuilder<T>
  like(column: keyof T, pattern: string): QueryBuilder<T>
  ilike(column: keyof T, pattern: string): QueryBuilder<T>
  in(column: keyof T, values: unknown[]): QueryBuilder<T>
  contains(column: keyof T, value: unknown): QueryBuilder<T>
  order(column: keyof T, options?: { ascending?: boolean }): QueryBuilder<T>
  limit(count: number): QueryBuilder<T>
  range(from: number, to: number): QueryBuilder<T>
  single(): Promise<Result<T>>
  maybeSingle(): Promise<Result<T | null>>
  execute(): Promise<Result<T[]>>
}

// ============================================================================
// SUPABASE CLIENT TYPES
// ============================================================================

export interface SupabaseClient {
  // Authentication
  auth: {
    getUser(): Promise<Result<{ user: UserProfile | null }>>
    signUp(credentials: SignUpCredentials): Promise<Result<AuthResponse>>
    signInWithPassword(credentials: SignInCredentials): Promise<Result<AuthResponse>>
    signOut(): Promise<Result<void>>
    resetPasswordForEmail(email: string): Promise<Result<void>>
    updateUser(attributes: UserAttributes): Promise<Result<AuthResponse>>
    onAuthStateChange(callback: AuthStateChangeCallback): { data: { subscription: unknown } }
  }

  // Database operations
  from<T extends keyof Tables>(table: T): QueryBuilder<Tables[T]['Row']>
  rpc<T extends keyof Functions>(
    fn: T,
    args?: Functions[T]['Args']
  ): Promise<Result<Functions[T]['Returns']>>

  // Real-time subscriptions
  channel(name: string): RealtimeChannel
  removeAllChannels(): void

  // Storage
  storage: {
    from(bucket: string): StorageBucket
  }
}

export interface AuthResponse {
  user: UserProfile | null
  session: AuthSession | null
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: UserProfile
}

export interface SignUpCredentials {
  email: string
  password: string
  options?: {
    data?: Record<string, unknown>
    captchaToken?: string
  }
}

export interface SignInCredentials {
  email: string
  password: string
  options?: {
    captchaToken?: string
  }
}

export interface UserAttributes {
  email?: string
  password?: string
  data?: Record<string, unknown>
}

export type AuthStateChangeCallback = (
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED',
  session: AuthSession | null
) => void

// ============================================================================
// REAL-TIME SUBSCRIPTION TYPES
// ============================================================================

export interface RealtimeChannel {
  on<T = unknown>(
    type: 'postgres_changes',
    filter: RealtimeFilter,
    callback: RealtimeCallback<T>
  ): RealtimeChannel
  on(
    type: 'presence' | 'broadcast',
    filter: Record<string, unknown>,
    callback: (payload: unknown) => void
  ): RealtimeChannel
  subscribe(callback?: (status: RealtimeChannelStatus) => void): RealtimeChannel
  unsubscribe(): Promise<'ok' | 'timed_out' | 'error'>
  send(payload: Record<string, unknown>): void
}

export interface RealtimeFilter {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema: string
  table: string
  filter?: string
}

export interface RealtimeCallback<T> {
  (payload: RealtimePayload<T>): void
}

export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
  schema: string
  table: string
  commit_timestamp: string
}

export type RealtimeChannelStatus = 
  | 'SUBSCRIBED' 
  | 'TIMED_OUT' 
  | 'CLOSED' 
  | 'CHANNEL_ERROR'

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface StorageBucket {
  upload(path: string, file: File, options?: UploadOptions): Promise<Result<FileObject>>
  download(path: string): Promise<Result<Blob>>
  list(path?: string, options?: ListOptions): Promise<Result<FileObject[]>>
  remove(paths: string[]): Promise<Result<FileObject[]>>
  createSignedUrl(path: string, expiresIn: number): Promise<Result<{ signedUrl: string }>>
  getPublicUrl(path: string): { data: { publicUrl: string } }
}

export interface FileObject {
  name: string
  id?: string
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?: Record<string, unknown>
  buckets?: unknown
}

export interface UploadOptions {
  cacheControl?: string
  contentType?: string
  upsert?: boolean
  duplex?: string
}

export interface ListOptions {
  limit?: number
  offset?: number
  sortBy?: { column: string; order: 'asc' | 'desc' }
}

// ============================================================================
// TYPED DATABASE OPERATIONS
// ============================================================================

export interface UserOperations {
  getProfile(userId: string): Promise<Result<UserProfile>>
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<Result<UserProfile>>
  getCertificationProgress(userId: string): Promise<Result<CertificationProgress[]>>
  getAssessmentHistory(userId: string, limit?: number): Promise<Result<AssessmentSession[]>>
  getHonorCodeStatus(userId: string): Promise<Result<{ violations: number; status: string }>>
}

export interface AssessmentOperations {
  createSession(data: AssessmentSessionInsert): Promise<Result<AssessmentSession>>
  getSession(sessionId: string): Promise<Result<AssessmentSession>>
  updateSession(sessionId: string, updates: AssessmentSessionUpdate): Promise<Result<AssessmentSession>>
  getQuestions(sessionId: string): Promise<Result<Question[]>>
  submitAnswers(sessionId: string, answers: Record<string, unknown>): Promise<Result<void>>
  completeSession(sessionId: string): Promise<Result<{ score: number; passed: boolean }>>
}

export interface CertificationOperations {
  issueCertificate(data: CertificateInsert): Promise<Result<CertificateDetails>>
  verifyCertificate(verificationCode: string): Promise<Result<CertificateDetails | null>>
  getCertificates(userId: string): Promise<Result<CertificateDetails[]>>
  revokeCertificate(certificateId: string, reason: string): Promise<Result<void>>
}

export interface QuestionOperations {
  getByCategory(categoryId: string, mode: 'practice' | 'certification'): Promise<Result<Question[]>>
  getById(questionId: string): Promise<Result<Question>>
  recordAccess(questionId: string, userId: string, sessionId: string): Promise<Result<void>>
  updateAnalytics(questionId: string, correct: boolean, timeSpent: number): Promise<Result<void>>
}

// ============================================================================
// RLS POLICY TYPES
// ============================================================================

export interface RLSContext {
  userId: string
  role: 'user' | 'admin' | 'moderator'
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  accountStatus: 'active' | 'suspended' | 'banned'
}

export interface PolicyDefinition {
  name: string
  table: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  using?: string
  withCheck?: string
  roles: string[]
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface SupabaseError {
  message: string
  details: string
  hint: string
  code: string
}

export interface DatabaseError extends SupabaseError {
  code: 
    | '23505' // unique_violation
    | '23503' // foreign_key_violation
    | '23502' // not_null_violation
    | '23514' // check_violation
    | '42501' // insufficient_privilege
    | '42P01' // undefined_table
    | 'PGRST116' // row_not_found
}

export interface AuthError extends SupabaseError {
  code:
    | 'invalid_credentials'
    | 'email_not_confirmed'
    | 'user_not_found'
    | 'weak_password'
    | 'signup_disabled'
    | 'email_address_invalid'
    | 'password_too_short'
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function transformUserRow(row: UserRow): UserProfile {
  const preferences = (row.preferences ?? {}) as unknown as UserProfile['preferences']

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    avatarUrl: row.avatar_url || undefined,
    timezone: row.timezone || 'UTC',
    locale: row.locale || 'en',
    accountStatus: row.account_status as UserProfile['accountStatus'],
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified || false,
    jobTitle: row.job_title || undefined,
    company: row.company || undefined,
    industry: row.industry || undefined,
    experienceLevel: (row.experience_level ?? 'beginner') as UserProfile['experienceLevel'],
    preferences,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at || undefined,
    lastActiveAt: row.last_active_at || undefined
  }
}

export function transformSessionRow(row: AssessmentSessionRow): AssessmentSession {
  const violations = (row.violations ?? []) as unknown as HonorCodeViolation[]
  const metadata = (row.metadata ?? {}) as unknown as AssessmentSession['metadata']

  return {
    id: row.id,
    userId: row.user_id,
    assessmentType: row.assessment_type as AssessmentSession['assessmentType'],
    certificationLevel: row.certification_level as AssessmentSession['certificationLevel'],
    categoryId: row.category_id || undefined,
    status: row.status as AssessmentSession['status'],
    token: row.token,
    fingerprint: row.fingerprint,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at || undefined,
    timeLimitMinutes: row.time_limit_minutes,
    timeSpentSeconds: row.time_spent_seconds || 0,
    totalQuestions: row.total_questions,
    currentQuestionIndex: row.current_question_index || 0,
    questionsAnswered: row.questions_answered || 0,
    score: row.score || undefined,
    passed: row.passed || undefined,
    honorCodeAccepted: row.honor_code_accepted,
    honorCodeAcceptedAt: row.honor_code_accepted_at || undefined,
    violations,
    metadata
  }
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  )
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    isSupabaseError(error) &&
    ['23505', '23503', '23502', '23514', '42501', '42P01', 'PGRST116'].includes(error.code)
  )
}

export function isAuthError(error: unknown): error is AuthError {
  return (
    isSupabaseError(error) &&
    [
      'invalid_credentials',
      'email_not_confirmed', 
      'user_not_found',
      'weak_password',
      'signup_disabled',
      'email_address_invalid',
      'password_too_short'
    ].includes(error.code)
  )
}

const supabaseTypes = {}

export default supabaseTypes
