/**
 * QuestionCard Responsive UI Tests
 * Tests for responsive layout and text overflow fixes
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuestionCard } from '@/features/assessment/components/QuestionCard'
import type { Question } from '@/types'

const mockQuestion: Question = {
  id: 'Q001',
  questionKey: 'Q001',
  questionText: 'What is the primary benefit of using TypeScript over JavaScript in large-scale applications?',
  questionFormat: 'multiple_choice' as const,
  difficulty: 'intermediate',
  categoryId: 'typescript',
  tags: ['typescript', 'javascript'],
  timeAllocationSeconds: 90,
  points: 2,
  complexityScore: 3,
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  options: [
    { id: 'option_0', text: 'Faster execution time', order: 0, isCorrect: false },
    { id: 'option_1', text: 'Better type safety and compile-time error detection', order: 1, isCorrect: true },
    { id: 'option_2', text: 'Smaller bundle size', order: 2, isCorrect: false },
    { id: 'option_3', text: 'Automatic memory management', order: 3, isCorrect: false }
  ],
  metadata: {
    authorId: 'admin',
    version: 1,
    usageCount: 0,
    averageScore: 0,
    averageTimeSpent: 0
  }
}

const mockQuestionWithLongText: Question = {
  ...mockQuestion,
  id: 'Q002',
  questionKey: 'Q002',
  questionText: 'In a microservices architecture with multiple independently deployable services communicating via REST APIs and message queues, what are the key considerations when implementing distributed transactions across service boundaries to ensure data consistency while maintaining service autonomy and avoiding tight coupling?',
  options: [
    {
      id: 'option_0',
      text: 'Use two-phase commit protocol with a distributed transaction coordinator to ensure ACID properties across all services, implementing blocking locks at the database level',
      order: 0,
      isCorrect: false
    },
    {
      id: 'option_1',
      text: 'Implement the Saga pattern with compensating transactions and eventual consistency, using either choreography with domain events or orchestration with a saga coordinator',
      order: 1,
      isCorrect: true
    },
    {
      id: 'option_2',
      text: 'Store all data in a single shared database accessible by all microservices to avoid distributed transaction complexity',
      order: 2,
      isCorrect: false
    },
    {
      id: 'option_3',
      text: 'Use synchronous HTTP calls between services with retry logic and circuit breakers, relying on database-level transactions within each service',
      order: 3,
      isCorrect: false
    }
  ]
}

describe('QuestionCard Responsive UI', () => {
  describe('Layout Responsiveness', () => {
    it('should render without crashing', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/Question 1 of 25/i)).toBeInTheDocument()
    })

    it('should display question text', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(mockQuestion.questionText)).toBeInTheDocument()
    })

    it('should render all answer options', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      mockQuestion.options?.forEach(option => {
        expect(screen.getByText(option.text)).toBeInTheDocument()
      })
    })

    it('should display time allocation and points', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/Suggested: 1:30/i)).toBeInTheDocument()
      expect(screen.getByText(/2 points/i)).toBeInTheDocument()
    })
  })

  describe('Text Overflow Handling', () => {
    it('should handle long question text without overflow', () => {
      render(
        <QuestionCard
          question={mockQuestionWithLongText}
          onAnswerSelect={() => {}}
          questionNumber={5}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      const questionText = screen.getByText(mockQuestionWithLongText.questionText)
      expect(questionText).toHaveClass('break-words')
    })

    it('should handle long option text without overflow', () => {
      const { container } = render(
        <QuestionCard
          question={mockQuestionWithLongText}
          onAnswerSelect={() => {}}
          questionNumber={5}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      // Check that long options are rendered with break-words
      const optionContainers = container.querySelectorAll('.break-words')
      expect(optionContainers.length).toBeGreaterThan(0)
    })

    it('should apply whitespace-pre-wrap to option text', () => {
      const { container } = render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      // Check that option text has whitespace-pre-wrap class
      const optionTexts = container.querySelectorAll('.whitespace-pre-wrap')
      expect(optionTexts.length).toBe(mockQuestion.options!.length)
    })
  })

  describe('Selection Status', () => {
    it('should show "please select" message when no answer selected', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/Please select an answer to continue/i)).toBeInTheDocument()
    })

    it('should show selected status when answer is selected', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          selectedAnswer={1}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/Selected: Option B/i)).toBeInTheDocument()
    })

    it('should not show "please select" when answer is selected', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          selectedAnswer={0}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.queryByText(/Please select an answer to continue/i)).not.toBeInTheDocument()
    })
  })

  describe('Option Labels', () => {
    it('should display correct option labels (A, B, C, D)', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.getByText('D')).toBeInTheDocument()
    })
  })

  describe('Responsive Classes', () => {
    it('should have responsive text size classes', () => {
      const { container } = render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      // Check for sm: breakpoint classes
      const responsiveElements = container.querySelectorAll('[class*="sm:"]')
      expect(responsiveElements.length).toBeGreaterThan(0)
    })

    it('should have flex-shrink-0 on icons to prevent squishing', () => {
      const { container } = render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      const flexShrinkElements = container.querySelectorAll('.flex-shrink-0')
      expect(flexShrinkElements.length).toBeGreaterThan(0)
    })

    it('should have min-w-0 on option text container for proper text wrapping', () => {
      const { container } = render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      const minWidthElements = container.querySelectorAll('.min-w-0')
      expect(minWidthElements.length).toBe(mockQuestion.options!.length)
    })
  })

  describe('Question Metadata', () => {
    it('should display question ID', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/Question ID: Q001/i)).toBeInTheDocument()
    })

    it('should display question format', () => {
      render(
        <QuestionCard
          question={mockQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/Format: multiple choice/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle questions with 2 options', () => {
      const questionWith2Options: Question = {
        ...mockQuestion,
        options: [
          { id: 'option_0', text: 'True', order: 0, isCorrect: true },
          { id: 'option_1', text: 'False', order: 1, isCorrect: false }
        ]
      }

      render(
        <QuestionCard
          question={questionWith2Options}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.queryByText('C')).not.toBeInTheDocument()
    })

    it('should handle questions with 6 options', () => {
      const questionWith6Options: Question = {
        ...mockQuestion,
        options: [
          { id: 'option_0', text: 'Option 1', order: 0, isCorrect: false },
          { id: 'option_1', text: 'Option 2', order: 1, isCorrect: true },
          { id: 'option_2', text: 'Option 3', order: 2, isCorrect: false },
          { id: 'option_3', text: 'Option 4', order: 3, isCorrect: false },
          { id: 'option_4', text: 'Option 5', order: 4, isCorrect: false },
          { id: 'option_5', text: 'Option 6', order: 5, isCorrect: false }
        ]
      }

      render(
        <QuestionCard
          question={questionWith6Options}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('F')).toBeInTheDocument()
    })

    it('should handle single point question', () => {
      const singlePointQuestion: Question = {
        ...mockQuestion,
        points: 1
      }

      render(
        <QuestionCard
          question={singlePointQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(/1 point$/i)).toBeInTheDocument()
    })

    it('should handle options without explicit order properties cleanly', () => {
      const unorderedQuestion: Question = {
        ...mockQuestion,
        options: [
          { id: 'opt_a', text: 'Unordered First', isCorrect: true },
          { id: 'opt_b', text: 'Unordered Second', isCorrect: false }
        ] as any
      }

      render(
        <QuestionCard
          question={unorderedQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText('Unordered First')).toBeInTheDocument()
    })

    it('should handle 1,000 character continuous word in option text without throwing', () => {
      const longWord = 'W' + 'o'.repeat(1000) + 'rd'
      const longWordQuestion: Question = {
        ...mockQuestion,
        options: [
          { id: 'option_0', text: longWord, order: 0, isCorrect: true }
        ]
      }

      render(
        <QuestionCard
          question={longWordQuestion}
          onAnswerSelect={() => {}}
          questionNumber={1}
          totalQuestions={25}
          isSubmitting={false}
        />
      )

      expect(screen.getByText(longWord)).toBeInTheDocument()
    })
  })
})
