'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, AlertCircle } from 'lucide-react'
import type { SanitizedQuestion } from '@/types/core'

interface QuestionCardProps {
  question: SanitizedQuestion
  selectedAnswer?: number
  onAnswerSelect: (answerIndex: number) => void
  questionNumber: number
  totalQuestions: number
  isSubmitting: boolean
}

export function QuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  isSubmitting
}: QuestionCardProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3">
        {/* Question Number and Metadata - Responsive Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl">
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Suggested: {formatTime(question.timeAllocationSeconds)}</span>
            </div>
            <div className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
              {question.points} {question.points === 1 ? 'point' : 'points'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Question Text */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-foreground leading-relaxed text-sm sm:text-base break-words">
            {question.questionText}
          </p>
        </div>

        {/* Answer Options */}
        <div className="space-y-2 sm:space-y-3">
          {question.options?.map((option, index) => (
            <div key={index} className="relative">
              <Button
                variant={selectedAnswer === index ? "default" : "outline"}
                className={`w-full text-left justify-start h-auto min-h-[3rem] p-3 sm:p-4 ${
                  selectedAnswer === index 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white' 
                    : 'hover:bg-accent hover:text-accent-foreground text-foreground border-border'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isSubmitting && onAnswerSelect(index)}
                disabled={isSubmitting}
              >
                <div className="flex items-start gap-2 sm:gap-3 w-full">
                  <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-medium ${
                    selectedAnswer === index
                      ? 'bg-white text-blue-600 border-white'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="leading-relaxed text-sm sm:text-base break-words whitespace-pre-wrap">{option.text}</p>
                  </div>
                </div>
              </Button>
            </div>
          ))}
        </div>

        {/* Selection Status */}
        {selectedAnswer === undefined && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">Please select an answer to continue</span>
          </div>
        )}

        {selectedAnswer !== undefined && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-800/50 p-3 rounded-lg">
            <div className="h-4 w-4 flex-shrink-0 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">✓</div>
            <span className="text-xs sm:text-sm">Selected: Option {String.fromCharCode(65 + selectedAnswer)}</span>
          </div>
        )}

        {/* Question Metadata */}
        <div className="text-xs text-muted-foreground border-t border-border pt-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
            <span className="truncate">Question ID: {question.questionKey}</span>
            <span className="truncate">Format: {question.questionFormat?.replace('_', ' ') || 'N/A'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
