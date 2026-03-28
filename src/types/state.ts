/**
 * ReadyCheck AI - State Management Types
 * Phase 5: Comprehensive TypeScript Architecture
 */

import type {
  AssessmentSession,
  Question,
  QuestionAnswer,
  CertificationProgress,
  UserProfile,
  HonorCodeViolation,
  ApiError,
  Result
} from './core'

// ============================================================================
// ASSESSMENT STATE TYPES
// ============================================================================

export interface AssessmentState {
  // Session management
  session: AssessmentSession | null
  isLoading: boolean
  error: ApiError | null
  
  // Question navigation
  currentQuestion: Question | null
  currentQuestionIndex: number
  totalQuestions: number
  questions: Question[]
  
  // Answer tracking
  answers: Record<string, QuestionAnswer>
  unsavedAnswers: Record<string, QuestionAnswer>
  autoSaveEnabled: boolean
  lastSaved: string | null
  
  // Timer and progress
  timeRemaining: number
  timeSpent: number
  isTimerActive: boolean
  progressPercentage: number
  
  // Honor code monitoring
  violations: HonorCodeViolation[]
  honorCodeStatus: 'accepted' | 'violated' | 'warning'
  tabSwitchCount: number
  copyPasteAttempts: number
  
  // UI state
  showInstructions: boolean
  showExitConfirmation: boolean
  showSubmitConfirmation: boolean
  isSubmitting: boolean
  
  // Navigation flags
  canNavigateBack: boolean
  canNavigateForward: boolean
  canSubmit: boolean
  hasUnsavedChanges: boolean
}

export interface AssessmentActions {
  // Session management
  startSession: (sessionId: string) => Promise<Result<void>>
  endSession: () => Promise<Result<void>>
  pauseSession: () => void
  resumeSession: () => void
  
  // Question navigation
  goToQuestion: (index: number) => Promise<Result<void>>
  nextQuestion: () => Promise<Result<void>>
  previousQuestion: () => Promise<Result<void>>
  
  // Answer management
  submitAnswer: (questionId: string, answer: QuestionAnswer) => Promise<Result<void>>
  saveAnswerDraft: (questionId: string, answer: QuestionAnswer) => void
  autoSaveAnswers: () => Promise<Result<void>>
  
  // Assessment completion
  submitAssessment: () => Promise<Result<{ sessionId: string; score: number }>>
  flagQuestion: (questionId: string, reason: string) => void
  
  // Honor code monitoring
  recordViolation: (violation: HonorCodeViolation) => void
  acknowledgeWarning: () => void
  
  // UI actions
  toggleInstructions: () => void
  showExitDialog: () => void
  hideExitDialog: () => void
  confirmExit: () => void
}

// ============================================================================
// USER PROFILE STATE TYPES
// ============================================================================

export interface UserState {
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: ApiError | null
  
  // Certification progress
  certificationProgress: CertificationProgress[]
  activeCertifications: string[]
  expiringSoon: string[]
  
  // Subscription and permissions
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'cancelled'
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  permissions: {
    canTakeCertification: boolean
    canAccessPremiumContent: boolean
    maxConcurrentSessions: number
    canExportData: boolean
  }
  
  // Assessment history
  recentAssessments: AssessmentSession[]
  assessmentStats: {
    totalCompleted: number
    averageScore: number
    timeSpent: number
    certificationsEarned: number
  }
  
  // Preferences and settings
  preferences: {
    notifications: Record<string, boolean>
    assessment: Record<string, boolean>
    privacy: Record<string, boolean | string>
    accessibility: Record<string, boolean>
  }
}

export interface UserActions {
  // Authentication
  signIn: (email: string, password: string) => Promise<Result<UserProfile>>
  signOut: () => Promise<Result<void>>
  refreshSession: () => Promise<Result<void>>
  
  // Profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<Result<UserProfile>>
  updatePreferences: (preferences: Partial<UserState['preferences']>) => Promise<Result<void>>
  
  // Certification progress
  refreshCertificationProgress: () => Promise<Result<void>>
  checkPrerequisites: (levelCode: string) => Promise<Result<{ canAttempt: boolean; missing: string[] }>>
  
  // Assessment history
  loadAssessmentHistory: (limit?: number) => Promise<Result<void>>
  getAssessmentDetails: (sessionId: string) => Promise<Result<AssessmentSession>>
}

// ============================================================================
// APPLICATION STATE TYPES
// ============================================================================

export interface AppState {
  // Global loading and error states
  isInitializing: boolean
  globalError: ApiError | null
  
  // Navigation and routing
  currentRoute: string
  previousRoute: string | null
  navigationHistory: string[]
  
  // UI state
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  
  // Feature flags
  features: {
    honorCodeMonitoring: boolean
    autoSave: boolean
    realTimeSync: boolean
    advancedAnalytics: boolean
    betaFeatures: boolean
  }
  
  // System status
  connectionStatus: 'online' | 'offline' | 'reconnecting'
  lastSyncTime: string | null
  pendingOperations: number
  
  // Notifications
  notifications: AppNotification[]
  unreadCount: number
}

export interface AppNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  persistent: boolean
  actions?: Array<{
    label: string
    action: () => void
    style: 'primary' | 'secondary' | 'danger'
  }>
}

export interface AppActions {
  // Initialization
  initialize: () => Promise<Result<void>>
  reset: () => void
  
  // Navigation
  navigate: (route: string) => void
  goBack: () => void
  
  // UI management
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (language: string) => void
  
  // Notifications
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearAllNotifications: () => void
  
  // System status
  setConnectionStatus: (status: 'online' | 'offline' | 'reconnecting') => void
  incrementPendingOperations: () => void
  decrementPendingOperations: () => void
}

// ============================================================================
// STORE COMPOSITION TYPES
// ============================================================================

export interface RootState {
  assessment: AssessmentState
  user: UserState
  app: AppState
}

export interface RootActions {
  assessment: AssessmentActions
  user: UserActions
  app: AppActions
}

export interface Store {
  state: RootState
  actions: RootActions
  subscribe: (listener: (state: RootState) => void) => () => void
  getState: () => RootState
  dispatch: <T extends keyof RootActions>(
    slice: T,
    action: keyof RootActions[T],
    ...args: unknown[]
  ) => Promise<unknown>
}

// ============================================================================
// HOOK TYPES FOR REACT INTEGRATION
// ============================================================================

export interface UseAssessmentReturn {
  // State
  session: AssessmentSession | null
  currentQuestion: Question | null
  currentIndex: number
  totalQuestions: number
  answers: Record<string, QuestionAnswer>
  timeRemaining: number
  progressPercentage: number
  violations: HonorCodeViolation[]
  isLoading: boolean
  error: ApiError | null
  
  // Actions
  startSession: (sessionId: string) => Promise<Result<void>>
  goToQuestion: (index: number) => Promise<Result<void>>
  submitAnswer: (questionId: string, answer: QuestionAnswer) => Promise<Result<void>>
  submitAssessment: () => Promise<Result<{ sessionId: string; score: number }>>
  recordViolation: (violation: HonorCodeViolation) => void
  
  // Computed values
  canNavigateBack: boolean
  canNavigateForward: boolean
  canSubmit: boolean
  hasUnsavedChanges: boolean
}

export interface UseUserReturn {
  // State
  profile: UserProfile | null
  isAuthenticated: boolean
  certificationProgress: CertificationProgress[]
  subscriptionStatus: string
  permissions: UserState['permissions']
  isLoading: boolean
  error: ApiError | null
  
  // Actions
  signIn: (email: string, password: string) => Promise<Result<UserProfile>>
  signOut: () => Promise<Result<void>>
  updateProfile: (updates: Partial<UserProfile>) => Promise<Result<UserProfile>>
  refreshCertificationProgress: () => Promise<Result<void>>
  
  // Computed values
  canTakeCertification: boolean
  hasActiveCertifications: boolean
  subscriptionExpired: boolean
}

export interface UseAppReturn {
  // State
  isInitializing: boolean
  connectionStatus: string
  notifications: AppNotification[]
  theme: string
  sidebarOpen: boolean
  
  // Actions
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  
  // Computed values
  unreadNotifications: number
  isOnline: boolean
  hasPendingOperations: boolean
}

// ============================================================================
// MIDDLEWARE AND ENHANCER TYPES
// ============================================================================

export type NextFunction = (action: unknown) => unknown

export interface StoreMiddleware {
  (store: Store): (next: NextFunction) => NextFunction
}

export interface PersistenceConfig {
  key: string
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB'
  whitelist?: string[]
  blacklist?: string[]
  transforms?: Array<{
    in: (state: unknown) => unknown
    out: (state: unknown) => unknown
  }>
}

export interface DevToolsConfig {
  enabled: boolean
  maxAge: number
  trace: boolean
  traceLimit: number
}

export interface StoreConfig {
  persistence?: PersistenceConfig
  devTools?: DevToolsConfig
  middleware?: StoreMiddleware[]
  initialState?: Partial<RootState>
}

// ============================================================================
// ASYNC ACTION TYPES
// ============================================================================

export interface AsyncAction<T = unknown> {
  type: string
  payload?: T
  meta?: {
    requestId: string
    timestamp: string
    retries: number
  }
}

export interface AsyncActionCreator<TArgs extends unknown[] = [], TReturn = unknown> {
  (...args: TArgs): AsyncAction<TReturn>
  pending: (requestId: string, ...args: TArgs) => AsyncAction
  fulfilled: (requestId: string, result: TReturn) => AsyncAction<TReturn>
  rejected: (requestId: string, error: ApiError) => AsyncAction<ApiError>
}

export interface ThunkAction<TReturn = void> {
  (dispatch: Store['dispatch'], getState: () => RootState): Promise<TReturn>
}

// ============================================================================
// SELECTOR TYPES
// ============================================================================

export interface Selector<TState = RootState, TReturn = unknown> {
  (state: TState): TReturn
}

export interface ParametricSelector<TState = RootState, TParams = unknown, TReturn = unknown> {
  (state: TState, params: TParams): TReturn
}

export interface MemoizedSelector<TState = RootState, TReturn = unknown> extends Selector<TState, TReturn> {
  recomputations: () => number
  resetRecomputations: () => void
}

// Named exports only - no default export
export {}
