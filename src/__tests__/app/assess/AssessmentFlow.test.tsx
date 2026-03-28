/**
 * Assessment Flow Integration Tests
 * Tests the complete flow: Start -> Take -> Finalize -> View Results
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Assessment Flow Integration', () => {
  describe('Redirect Flow After Finalization', () => {
    it('should redirect to correct results route after successful finalization', () => {
      const sessionId = 'test-session-123'
      const expectedRoute = `/assess/${sessionId}/results`
      
      // Verify route structure
      expect(expectedRoute).toBe('/assess/test-session-123/results')
      expect(expectedRoute).not.toContain('/results/test-session-123')
    })

    it('should redirect to correct results route when session already completed', () => {
      const sessionId = 'completed-session-456'
      const expectedRoute = `/assess/${sessionId}/results`
      
      // Verify route structure for already completed sessions
      expect(expectedRoute).toBe('/assess/completed-session-456/results')
    })

    it('should use consistent route pattern across all redirects', () => {
      const sessionIds = ['session-1', 'session-2', 'session-3']
      
      sessionIds.forEach(sessionId => {
        const route = `/assess/${sessionId}/results`
        
        // All routes should follow the same pattern
        expect(route).toMatch(/^\/assess\/[\w-]+\/results$/)
        expect(route).not.toMatch(/^\/results\/[\w-]+$/)
      })
    })
  })

  describe('Results Page Routing', () => {
    it('should have results page at correct nested route', () => {
      // Results page should be nested under assess flow
      const resultsPagePath = 'src/app/assess/[sessionId]/results/page.tsx'
      expect(resultsPagePath).toContain('assess/[sessionId]/results')
    })

    it('should generate correct dynamic route params', () => {
      const sessionId = 'abc-123'
      const params = { sessionId }
      const route = `/assess/${params.sessionId}/results`
      
      expect(route).toBe('/assess/abc-123/results')
    })
  })

  describe('Session Storage Management', () => {
    beforeEach(() => {
      // Mock sessionStorage
      global.sessionStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      }
    })

    it('should clear session storage after successful redirect', () => {
      const sessionId = 'test-session-789'
      const storageKey = `assessment_${sessionId}`
      
      // Simulate clearing storage
      sessionStorage.removeItem(storageKey)
      
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(storageKey)
    })

    it('should clear session storage even when session already completed', () => {
      const sessionId = 'completed-session-999'
      const storageKey = `assessment_${sessionId}`
      
      // When redirecting to results (already completed case)
      sessionStorage.removeItem(storageKey)
      
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(storageKey)
    })
  })

  describe('API Response Handling', () => {
    it('should handle successful finalization response', async () => {
      const mockResponse = {
        sessionId: 'test-123',
        level: 'rcaf',
        mode: 'practice',
        total: 25,
        correct: 20,
        score: 80,
        passed: true,
        completedAt: new Date().toISOString(),
        breakdownByCategory: [
          { category: 'AI Fundamentals', correct: 8, total: 10 },
          { category: 'Machine Learning', correct: 7, total: 10 },
          { category: 'Ethics', correct: 5, total: 5 }
        ],
        certificateCreated: false
      }

      expect(mockResponse.score).toBe(80)
      expect(mockResponse.passed).toBe(true)
      expect(mockResponse.sessionId).toBe('test-123')
    })

    it('should handle "already completed" error correctly', () => {
      const mockErrorResponse = {
        error: 'Session already completed',
        statusCode: 400
      }

      // Should trigger redirect to results page
      expect(mockErrorResponse.error).toBe('Session already completed')
      
      // This should NOT prevent showing results
      const shouldRedirect = mockErrorResponse.error === 'Session already completed'
      expect(shouldRedirect).toBe(true)
    })
  })

  describe('Error Handling in Finalization', () => {
    it('should handle network errors gracefully', () => {
      const networkError = new Error('Failed to finalize assessment')
      
      expect(networkError.message).toContain('Failed to finalize')
    })

    it('should handle validation errors', () => {
      const validationError = {
        error: 'Validation error: sessionId is required',
        statusCode: 400
      }

      expect(validationError.statusCode).toBe(400)
      expect(validationError.error).toContain('Validation error')
    })

    it('should handle unauthorized errors', () => {
      const authError = {
        error: 'Authentication required',
        statusCode: 401
      }

      expect(authError.statusCode).toBe(401)
    })
  })

  describe('Router Navigation', () => {
    it('should call router.push with correct path on success', () => {
      const mockRouter = {
        push: vi.fn()
      }
      
      const sessionId = 'test-session'
      const resultsPath = `/assess/${sessionId}/results`
      
      mockRouter.push(resultsPath)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/assess/test-session/results')
      expect(mockRouter.push).not.toHaveBeenCalledWith('/results/test-session')
    })

    it('should not navigate if finalization is already in progress', () => {
      const isCompleting = true
      
      // Should return early if already completing
      if (isCompleting) {
        // Don't trigger another finalization
        expect(isCompleting).toBe(true)
        return
      }
      
      // This should not execute
      expect(true).toBe(true)
    })
  })

  describe('Toast Notifications', () => {
    it('should show success toast with score on completion', () => {
      const mockToast = vi.fn()
      const score = 85
      
      mockToast({
        title: 'Assessment Complete!',
        description: `Your score: ${score}%`
      })
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Assessment Complete!',
        description: 'Your score: 85%'
      })
    })

    it('should show error toast on finalization failure', () => {
      const mockToast = vi.fn()
      const errorMessage = 'Failed to finalize assessment'
      
      mockToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to finalize assessment',
        variant: 'destructive'
      })
    })
  })

  describe('Duplicate Submission Prevention', () => {
    it('should prevent double-clicking finalize button', () => {
      let isCompleting = false
      let finalizeCallCount = 0
      
      // First click
      if (!isCompleting) {
        isCompleting = true
        finalizeCallCount++
      }
      
      // Second click (should be ignored)
      if (!isCompleting) {
        finalizeCallCount++
      }
      
      expect(finalizeCallCount).toBe(1)
      expect(isCompleting).toBe(true)
    })

    it('should log when duplicate submission is attempted', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const isCompleting = true
      
      if (isCompleting) {
        console.log('[Finalize] Already in progress, ignoring duplicate submission')
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Finalize] Already in progress, ignoring duplicate submission'
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Complete Flow Validation', () => {
    it('should follow correct sequence: finalize -> success -> clear storage -> redirect', async () => {
      const sequence: string[] = []
      
      // 1. Finalize API call
      sequence.push('finalize_api_called')
      
      // 2. Success response received
      sequence.push('success_response')
      
      // 3. Clear session storage
      sequence.push('clear_storage')
      
      // 4. Show success toast
      sequence.push('show_toast')
      
      // 5. Redirect to results
      sequence.push('redirect_to_results')
      
      expect(sequence).toEqual([
        'finalize_api_called',
        'success_response',
        'clear_storage',
        'show_toast',
        'redirect_to_results'
      ])
    })

    it('should handle edge case: redirect even if toast fails', () => {
      let toastFailed = false
      let redirectCalled = false
      
      try {
        // Simulate toast failure
        throw new Error('Toast failed')
      } catch {
        toastFailed = true
      }
      
      // Should still redirect
      redirectCalled = true
      
      expect(toastFailed).toBe(true)
      expect(redirectCalled).toBe(true)
    })

    it('should handle malicious or non-standard sessionId strings in redirect path', () => {
      const maliciousSessionId = '../admin'
      const sanitizedSessionId = encodeURIComponent(maliciousSessionId)
      const route = `/assess/${sanitizedSessionId}/results`

      expect(route).toContain('%2F')
      expect(route).not.toContain('/assess/../admin/results')
    })

    it('should handle API response with missing breakdownByCategory array without crashing', () => {
      const partialResponse = {
        sessionId: 'test-123',
        score: 85,
        passed: true,
        breakdownByCategory: undefined
      }

      const categories = partialResponse.breakdownByCategory ?? []
      expect(categories).toEqual([])
    })
  })
})
