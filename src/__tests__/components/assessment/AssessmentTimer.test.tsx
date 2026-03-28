import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AssessmentTimer } from '@/features/assessment/components/AssessmentTimer'

describe('AssessmentTimer', () => {
  const mockOnTimeExpired = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnTimeExpired.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays initial time correctly', () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    expect(screen.getByText('30:00')).toBeInTheDocument()
  })

  it('counts down correctly', () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    expect(screen.getByText('5:00')).toBeInTheDocument()

    // Advance time by 1 minute
    act(() => {
      vi.advanceTimersByTime(60 * 1000)
    })

    expect(screen.getByText('4:00')).toBeInTheDocument()
  })

  it('shows warning color when time is low', () => {
    const expiresAt = new Date(Date.now() + 8 * 60 * 1000).toISOString() // 8 minutes from now (between 5-10 minutes)

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    const timerElement = screen.getByText('8:00')
    expect(timerElement).toHaveClass('text-amber-600')
  })

  it('shows critical color when time is very low', () => {
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000).toISOString() // 1 minute from now

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    const timerElement = screen.getByText('1:00')
    expect(timerElement).toHaveClass('text-red-600')
  })

  it('calls onTimeExpired when timer expires', () => {
    const expiresAt = new Date(Date.now() + 1000).toISOString() // 1 second from now

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    // Advance time past expiration
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockOnTimeExpired).toHaveBeenCalled()
    expect(screen.getByText('Time Expired')).toBeInTheDocument()
  })

  it('handles seconds display correctly', () => {
    const expiresAt = new Date(Date.now() + 90 * 1000).toISOString() // 1 minute 30 seconds

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    expect(screen.getByText('1:30')).toBeInTheDocument()

    // Advance by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30 * 1000)
    })

    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('handles expired timer on mount', () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString() // Already expired

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    expect(screen.getByText('Time Expired')).toBeInTheDocument()
    expect(mockOnTimeExpired).toHaveBeenCalled()
  })

  it('formats time with leading zeros', () => {
    const expiresAt = new Date(Date.now() + 9 * 1000).toISOString() // 9 seconds

    render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    expect(screen.getByText('0:09')).toBeInTheDocument()

    // Advance by 4 seconds
    act(() => {
      vi.advanceTimersByTime(4 * 1000)
    })

    expect(screen.getByText('0:05')).toBeInTheDocument()
  })

  it('cleans up timer on unmount', () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { unmount } = render(
      <AssessmentTimer
        expiresAt={expiresAt}
        onTimeExpired={mockOnTimeExpired}
      />
    )

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    
    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should handle invalid date string in expiresAt gracefully', () => {
    render(
      <AssessmentTimer
        expiresAt="not-a-valid-date"
        onTimeExpired={mockOnTimeExpired}
      />
    )

    expect(screen.getByText(/NaN:NaN|Expired/i)).toBeInTheDocument()
  })
})
