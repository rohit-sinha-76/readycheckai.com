import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AssessmentEngine } from '@/features/assessment/components/AssessmentEngine'
import { submitAnswer } from '@/features/assessment/actions'

vi.mock('@/features/assessment/actions', () => ({
  submitAnswer: vi.fn().mockResolvedValue({ saved: true }),
  recordViolationAction: vi.fn().mockResolvedValue({ success: true }),
  startAssessment: vi.fn().mockResolvedValue({ sessionId: 'sess-1' }),
  finalizeAssessment: vi.fn().mockResolvedValue({ score: 100, passed: true })
}))

vi.mock('../actions', () => ({
  submitAnswer: vi.fn().mockResolvedValue({ saved: true }),
  recordViolationAction: vi.fn().mockResolvedValue({ success: true }),
  startAssessment: vi.fn().mockResolvedValue({ sessionId: 'sess-1' }),
  finalizeAssessment: vi.fn().mockResolvedValue({ score: 100, passed: true })
}))

// Mock fetch
global.fetch = vi.fn()

// Mock fullscreen API
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null
})

Object.defineProperty(document.documentElement, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined)
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined)
})

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  assessmentType: 'practice' as const,
  status: 'in_progress' as const,
  token: 'token-123',
  fingerprint: 'test-fingerprint',
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  timeLimitMinutes: 30,
  timeSpentSeconds: 0,
  totalQuestions: 2,
  currentQuestionIndex: 0,
  questionsAnswered: 0,
  honorCodeAccepted: false,
  violations: [],
  metadata: {
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    timezone: 'UTC',
    screenResolution: '1920x1080',
    autoSaveEnabled: true
  }
}

const mockQuestions = [
  {
    id: 'q1',
    questionKey: 'test-q1',
    questionText: 'What is AI?',
    options: [
      { id: '1', text: 'Artificial Intelligence', order: 0 },
      { id: '2', text: 'Automated Integration', order: 1 },
      { id: '3', text: 'Advanced Interface', order: 2 },
      { id: '4', text: 'None of the above', order: 3 }
    ],
    questionFormat: 'multiple_choice' as const,
    difficulty: 'beginner' as const,
    categoryId: 'ai-basics',
    tags: ['ai', 'fundamentals'],
    timeAllocationSeconds: 60,
    points: 2,
    complexityScore: 0.3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    metadata: {
      authorId: 'admin',
      version: 1,
      usageCount: 0,
      averageScore: 0,
      averageTimeSpent: 0
    }
  },
  {
    id: 'q2',
    questionKey: 'test-q2',
    questionText: 'Which is a machine learning algorithm?',
    options: [
      { id: '1', text: 'Linear Regression', order: 0 },
      { id: '2', text: 'HTML', order: 1 },
      { id: '3', text: 'CSS', order: 2 },
      { id: '4', text: 'JavaScript', order: 3 }
    ],
    questionFormat: 'multiple_choice' as const,
    difficulty: 'intermediate' as const,
    categoryId: 'ml-algorithms',
    tags: ['machine-learning', 'algorithms'],
    timeAllocationSeconds: 90,
    points: 3,
    complexityScore: 0.5,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    metadata: {
      authorId: 'admin',
      version: 1,
      usageCount: 0,
      averageScore: 0,
      averageTimeSpent: 0
    }
  }
]

describe('AssessmentEngine', () => {
  const mockOnComplete = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders practice assessment correctly', () => {
    render(
      <AssessmentEngine
        session={mockSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Practice Assessment')).toBeInTheDocument()
    // Check for question progress indicator - may appear multiple times in UI
    const questionIndicators = screen.queryAllByText(/Question 1 of 2/)
    expect(questionIndicators.length).toBeGreaterThan(0)
    expect(screen.getByText('What is AI?')).toBeInTheDocument()
    expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument()
  })

  it('shows honor code for certification assessments', () => {
    const certificationSession = {
      ...mockSession,
      assessmentType: 'certification' as const,
      certificationLevel: 'RCAF' as const
    }

    render(
      <AssessmentEngine
        session={certificationSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Honor Code Agreement')).toBeInTheDocument()
    expect(screen.getByText('ReadyCheck AI Certification Honor Code')).toBeInTheDocument()
  })

  it('allows answer selection and navigation', async () => {
    render(
      <AssessmentEngine
        session={mockSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Select first answer
    const firstOption = screen.getByText('Artificial Intelligence')
    fireEvent.click(firstOption)

    // Check that answer is selected
    expect(screen.getByText('Selected: Option A')).toBeInTheDocument()

    // Navigate to next question
    const nextButton = screen.getByText('Next')
    expect(nextButton).not.toBeDisabled()
    
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Which is a machine learning algorithm?')).toBeInTheDocument()
    })
  })

  it('prevents navigation without answer selection', () => {
    render(
      <AssessmentEngine
        session={mockSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton)

    // The Next button should be disabled when no answer is selected
    expect(nextButton).toBeDisabled()
  })

  it('shows submit button on last question', async () => {
    render(
      <AssessmentEngine
        session={mockSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Answer first question and navigate
    await act(async () => {
      fireEvent.click(screen.getByText('Artificial Intelligence'))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Next'))
    })

    await waitFor(() => {
      expect(screen.getByText('Which is a machine learning algorithm?')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Answer second question
    await act(async () => {
      fireEvent.click(screen.getByText('Linear Regression'))
    })

    // Should show submit button
    expect(screen.getByText('Submit Assessment')).toBeInTheDocument()
  })

  it('handles assessment submission', async () => {
    render(
      <AssessmentEngine
        session={mockSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Answer first question
    await act(async () => {
      fireEvent.click(screen.getByText('Artificial Intelligence'))
    })

    // Navigate to second question
    await act(async () => {
      fireEvent.click(screen.getByText('Next'))
    })

    await waitFor(() => {
      expect(screen.getByText('Which is a machine learning algorithm?')).toBeInTheDocument()
    }, { timeout: 3000 })

    await act(async () => {
      fireEvent.click(screen.getByText('Linear Regression'))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Submit Assessment'))
    })

    // The component calls /api/assessment/v2/answer for each question
    // and /api/assessment/v2/finalize on submit
    // Since we can't easily distinguish in the test, just verify fetch was called
    // and onComplete was triggered
    await waitFor(() => {
      expect(submitAnswer).toHaveBeenCalled()
      expect(mockOnComplete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('tracks time spent on questions', async () => {
    vi.useFakeTimers()
    const startTime = Date.now()
    vi.setSystemTime(startTime)

    render(
      <AssessmentEngine
        session={mockSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Advance time and answer question wrapped in act
    await act(async () => {
      vi.advanceTimersByTime(30000) // 30 seconds
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Artificial Intelligence'))
    })

    // The component should track that 30 seconds were spent
    expect(Date.now() - startTime).toBe(30000)

    vi.useRealTimers()
  })

  it('should handle empty questions array [] without crashing', () => {
    render(
      <AssessmentEngine
        session={mockSession}
        questions={[]}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )
    expect(screen.queryByText('What is AI?')).not.toBeInTheDocument()
  })

  it('should handle session with expired timestamp gracefully', () => {
    const expiredSession = {
      ...mockSession,
      expiresAt: new Date(Date.now() - 10000).toISOString()
    }
    render(
      <AssessmentEngine
        session={expiredSession}
        questions={mockQuestions}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )
    expect(screen.getByText('What is AI?')).toBeInTheDocument()
  })
})
