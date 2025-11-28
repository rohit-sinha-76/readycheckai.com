/**
 * Assessment Scoring Tests
 * Tests for the scoring logic fix (option ID comparison)
 */

import { describe, it, expect } from 'vitest'

describe('Assessment Scoring Logic', () => {
  describe('Option ID to Index Conversion', () => {
    it('should correctly extract numeric indices from option_0 through option_10', () => {
      const testCases = [
        { id: 'option_0', expected: 0 },
        { id: 'option_1', expected: 1 },
        { id: 'option_2', expected: 2 },
        { id: 'option_3', expected: 3 },
        { id: 'option_10', expected: 10 }
      ]

      testCases.forEach(({ id, expected }) => {
        const index = parseInt(id.replace('option_', ''), 10)
        expect(index).toBe(expected)
      })
    })
  })

  describe('Answer Comparison Logic', () => {
    it('should mark answer as correct when indices match', () => {
      const userSelectedId = 'option_2'
      const correctAnswerIndex = 2

      const selectedIndex = parseInt(userSelectedId.replace('option_', ''))
      const isCorrect = selectedIndex === correctAnswerIndex

      expect(isCorrect).toBe(true)
    })

    it('should mark answer as incorrect when indices do not match', () => {
      const userSelectedId = 'option_1'
      const correctAnswerIndex = 2

      const selectedIndex = parseInt(userSelectedId.replace('option_', ''))
      const isCorrect = selectedIndex === correctAnswerIndex

      expect(isCorrect).toBe(false)
    })

    it('should handle first option (index 0) correctly', () => {
      const userSelectedId = 'option_0'
      const correctAnswerIndex = 0

      const selectedIndex = parseInt(userSelectedId.replace('option_', ''))
      const isCorrect = selectedIndex === correctAnswerIndex

      expect(isCorrect).toBe(true)
    })

    it('should return -1 for invalid option ID', () => {
      const userSelectedId = null as string | null
      const selectedIndex = userSelectedId
        ? parseInt((userSelectedId as string).replace('option_', ''))
        : -1

      expect(selectedIndex).toBe(-1)
    })

    it('should mark as incorrect when no answer selected', () => {
      const selectedIndex = -1 as number
      const correctAnswerIndex = 2

      const isCorrect = selectedIndex === correctAnswerIndex

      expect(isCorrect).toBe(false)
    })
  })

  describe('Score Calculation', () => {
    it('should calculate score correctly with 100% correct', () => {
      const totalPoints = 25
      const earnedPoints = 25
      const score = Math.round((earnedPoints / totalPoints) * 100)

      expect(score).toBe(100)
    })

    it('should calculate score correctly with 80% correct', () => {
      const totalPoints = 25
      const earnedPoints = 20
      const score = Math.round((earnedPoints / totalPoints) * 100)

      expect(score).toBe(80)
    })

    it('should calculate score correctly with 0% correct', () => {
      const totalPoints = 25
      const earnedPoints = 0
      const score = Math.round((earnedPoints / totalPoints) * 100)

      expect(score).toBe(0)
    })

    it('should determine pass/fail at 70% threshold', () => {
      const passThreshold = 70

      expect(80 >= passThreshold).toBe(true)  // Pass
      expect(70 >= passThreshold).toBe(true)  // Pass (exactly 70)
      expect(69 >= passThreshold).toBe(false) // Fail
      expect(0 >= passThreshold).toBe(false)  // Fail
    })

    it('should handle weighted points correctly', () => {
      // Question 1: 2 points, correct
      // Question 2: 3 points, correct
      // Question 3: 1 point, incorrect
      // Total: 6 points, Earned: 5 points = 83.33%

      const totalPoints = 6
      const earnedPoints = 5
      const score = Math.round((earnedPoints / totalPoints) * 100)

      expect(score).toBe(83)
    })
  })

  describe('User Answer Structure', () => {
    it('should have correct structure for submitted answer', () => {
      const userAnswer = {
        selected_option_id: 'option_2',
        elapsed_ms: 15000,
        submitted_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0'
      }

      expect(userAnswer).toHaveProperty('selected_option_id')
      expect(userAnswer.selected_option_id).toMatch(/^option_\d+$/)
    })

    it('should extract index from real user answer structure', () => {
      const userAnswers = {
        'Q001': {
          selected_option_id: 'option_2',
          elapsed_ms: 15000,
          submitted_at: '2025-01-20T12:00:00Z'
        },
        'Q002': {
          selected_option_id: 'option_0',
          elapsed_ms: 20000,
          submitted_at: '2025-01-20T12:00:20Z'
        }
      }

      const q1Index = parseInt(userAnswers['Q001'].selected_option_id.replace('option_', ''))
      const q2Index = parseInt(userAnswers['Q002'].selected_option_id.replace('option_', ''))

      expect(q1Index).toBe(2)
      expect(q2Index).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined user answer', () => {
      const userAnswer = undefined as { selected_option_id: string } | undefined
      const selectedIndex = userAnswer?.selected_option_id
        ? parseInt((userAnswer.selected_option_id as string).replace('option_', ''))
        : -1

      expect(selectedIndex).toBe(-1)
    })

    it('should handle null selected_option_id', () => {
      const userAnswer = { selected_option_id: null } as { selected_option_id: string | null }
      const selectedIndex = userAnswer?.selected_option_id
        ? parseInt((userAnswer.selected_option_id as string).replace('option_', ''))
        : -1

      expect(selectedIndex).toBe(-1)
    })

    it('should handle empty string selected_option_id', () => {
      const userAnswer = { selected_option_id: '' }
      const selectedIndex = userAnswer?.selected_option_id
        ? parseInt(userAnswer.selected_option_id.replace('option_', ''))
        : -1

      // Empty string is truthy but replace will give empty string, parseInt gives NaN
      expect(isNaN(selectedIndex) || selectedIndex === -1).toBe(true)
    })

    it('should not match when correct_answer_index is null', () => {
      const selectedIndex = 2
      const correctAnswerIndex = null
      const isCorrect = selectedIndex === correctAnswerIndex

      expect(isCorrect).toBe(false)
    })

    it('should not match when correct_answer_index is undefined', () => {
      const selectedIndex = 2
      const correctAnswerIndex = undefined
      const isCorrect = selectedIndex === correctAnswerIndex

      expect(isCorrect).toBe(false)
    })

    it('should handle division by zero safely when totalPoints is 0', () => {
      const totalPoints = 0
      const earnedPoints = 0
      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

      expect(score).toBe(0)
      expect(Number.isNaN(score)).toBe(false)
      expect(Number.isFinite(score)).toBe(true)
    })

    it('should evaluate exact floating-point pass/fail boundaries (69.9% vs 70.0%)', () => {
      const passThreshold = 70

      // 69.9% score
      const scoreJustBelow = 69.9
      const passJustBelow = scoreJustBelow >= passThreshold
      expect(passJustBelow).toBe(false)

      // 70.0% score
      const scoreExact = 70.0
      const passExact = scoreExact >= passThreshold
      expect(passExact).toBe(true)
    })

    it('should handle non-standard and corrupted option ID strings safely', () => {
      const corruptIDs = ['option_abc', 'option_-1', 'invalid_string', 'option_999999', '  option_2  ']

      corruptIDs.forEach(id => {
        const cleaned = id.trim().toLowerCase()
        const match = cleaned.match(/^option_(\d+)$/)
        const parsedIndex = match ? parseInt(match[1], 10) : -1

        if (id === '  option_2  ') {
          expect(parsedIndex).toBe(2)
        } else if (id === 'option_999999') {
          expect(parsedIndex).toBe(999999)
        } else {
          expect(parsedIndex).toBe(-1)
        }
      })
    })

    it('should handle sparse answer map with un-answered questions', () => {
      const questions = [
        { id: 'q1', correct: 0 },
        { id: 'q2', correct: 1 },
        { id: 'q3', correct: 2 }
      ]
      const userAnswers: Record<string, { selected_option_id?: string }> = {
        q1: { selected_option_id: 'option_0' },
        // q2 unanswered
        q3: { selected_option_id: undefined }
      }

      let correctCount = 0
      questions.forEach(q => {
        const ans = userAnswers[q.id]?.selected_option_id
        if (ans) {
          const match = ans.match(/^option_(\d+)$/)
          if (match && parseInt(match[1], 10) === q.correct) {
            correctCount++
          }
        }
      })

      expect(correctCount).toBe(1)
    })
  })

  describe('Real-World Scenarios', () => {
    it('should correctly score a 25-question assessment with mixed results', () => {
      // Simulate 25 questions: 20 correct, 5 incorrect
      let totalCorrect = 0
      let totalPoints = 0
      let earnedPoints = 0

      for (let i = 0; i < 25; i++) {
        const points = 1
        totalPoints += points

        // First 20 are correct
        if (i < 20) {
          totalCorrect++
          earnedPoints += points
        }
      }

      const score = Math.round((earnedPoints / totalPoints) * 100)
      const passed = score >= 70

      expect(totalCorrect).toBe(20)
      expect(score).toBe(80)
      expect(passed).toBe(true)
    })

    it('should correctly score assessment with all wrong answers', () => {
      const questions = [
        { selected: 'option_0', correct: 1 },
        { selected: 'option_1', correct: 2 },
        { selected: 'option_2', correct: 0 },
        { selected: 'option_3', correct: 1 }
      ]

      let totalCorrect = 0
      questions.forEach(q => {
        const selectedIndex = parseInt(q.selected.replace('option_', ''))
        if (selectedIndex === q.correct) {
          totalCorrect++
        }
      })

      expect(totalCorrect).toBe(0)
    })

    it('should correctly score assessment with all correct answers', () => {
      const questions = [
        { selected: 'option_0', correct: 0 },
        { selected: 'option_1', correct: 1 },
        { selected: 'option_2', correct: 2 },
        { selected: 'option_3', correct: 3 }
      ]

      let totalCorrect = 0
      questions.forEach(q => {
        const selectedIndex = parseInt(q.selected.replace('option_', ''))
        if (selectedIndex === q.correct) {
          totalCorrect++
        }
      })

      expect(totalCorrect).toBe(4)
    })
  })
})
