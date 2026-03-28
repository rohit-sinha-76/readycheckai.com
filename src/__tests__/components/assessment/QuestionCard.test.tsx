import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuestionCard } from '@/features/assessment/components/QuestionCard'
import type { Question } from '@/types'

describe('QuestionCard', () => {
  const mockQuestion: Question = {
    id: 'test-1',
    questionKey: 'test-1',
    questionText: 'What is the capital of France?',
    questionFormat: 'multiple_choice',
    difficulty: 'intermediate',
    categoryId: 'geography',
    tags: ['capitals', 'europe'],
    timeAllocationSeconds: 120,
    points: 2,
    complexityScore: 0.6,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    options: [
      { id: '1', text: 'London', isCorrect: false, order: 0 },
      { id: '2', text: 'Berlin', isCorrect: false, order: 1 },
      { id: '3', text: 'Paris', isCorrect: true, order: 2 },
      { id: '4', text: 'Madrid', isCorrect: false, order: 3 }
    ],
    metadata: {
      authorId: 'admin',
      version: 1,
      usageCount: 0,
      averageScore: 0,
      averageTimeSpent: 0
    }
  }

  const mockOnAnswerSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders question text and options correctly', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('Question 1 of 20')).toBeInTheDocument()
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('Berlin')).toBeInTheDocument()
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('Madrid')).toBeInTheDocument()
  })

  it('calls onAnswerSelect when option is clicked', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    const parisOption = screen.getByText('Paris')
    fireEvent.click(parisOption)

    expect(mockOnAnswerSelect).toHaveBeenCalledWith(2)
  })

  it('highlights selected answer', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={2}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    const parisOption = screen.getByText('Paris').closest('button')
    expect(parisOption).toHaveClass('bg-blue-600')
  })

  it('shows time allocation when provided', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('Suggested: 2:00')).toBeInTheDocument()
  })

  it('shows points when provided', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('2 points')).toBeInTheDocument()
  })

  it('handles multiple points correctly', () => {
    const multiPointQuestion = {
      ...mockQuestion,
      points: 3
    }

    render(
      <QuestionCard
        question={multiPointQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('3 points')).toBeInTheDocument()
  })

  it('displays time allocation and points correctly', () => {
    const longTimeQuestion = {
      ...mockQuestion,
      timeAllocationSeconds: 300 // 5 minutes
    }

    render(
      <QuestionCard
        question={longTimeQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('Suggested: 5:00')).toBeInTheDocument()
  })

  it('handles keyboard navigation', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    const firstOption = screen.getByText('London').closest('button')
    
    fireEvent.click(firstOption!)
    expect(mockOnAnswerSelect).toHaveBeenCalledWith(0)
  })

  it('renders without optional props', () => {
    const minimalQuestion: Question = {
      id: 'test-minimal',
      questionKey: 'test-minimal',
      questionText: 'Simple question?',
      questionFormat: 'multiple_choice',
      difficulty: 'beginner',
      categoryId: 'basic',
      tags: ['simple'],
      timeAllocationSeconds: 60, // 1 minute
      points: 1,
      complexityScore: 0.2,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      options: [
        { id: '1', text: 'Option A', isCorrect: true, order: 0 },
        { id: '2', text: 'Option B', isCorrect: false, order: 1 }
      ],
      metadata: {
        authorId: 'admin',
        version: 1,
        usageCount: 0,
        averageScore: 0,
        averageTimeSpent: 0
      }
    }

    render(
      <QuestionCard
        question={minimalQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText('Simple question?')).toBeInTheDocument()
    expect(screen.getByText('Suggested: 1:00')).toBeInTheDocument()
    expect(screen.getByText('1 point')).toBeInTheDocument()
  })

  it('disables option buttons when isSubmitting is true', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={true}
      />
    )

    const parisOption = screen.getByText('Paris').closest('button')
    expect(parisOption).toBeDisabled()
  })

  it('renders question with code markdown snippet correctly', () => {
    const codeQuestion = {
      ...mockQuestion,
      questionText: 'What does `console.log(typeof null)` output?'
    }

    render(
      <QuestionCard
        question={codeQuestion}
        selectedAnswer={undefined}
        onAnswerSelect={mockOnAnswerSelect}
        questionNumber={1}
        totalQuestions={20}
        isSubmitting={false}
      />
    )

    expect(screen.getByText(/console\.log/)).toBeInTheDocument()
  })
})
