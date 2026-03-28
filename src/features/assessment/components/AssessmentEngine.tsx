'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Shield } from 'lucide-react'
import { HonorCodeMonitor } from './HonorCodeMonitor'
import { QuestionCard } from './QuestionCard'
import { AssessmentTimer } from './AssessmentTimer'
import { submitAnswer, recordViolationAction } from '../actions'
import type { 
  SanitizedQuestion, 
  AssessmentSession, 
  SubmissionResult,
  HonorCodeViolation,
  HonorCodeViolationType
} from '@/types/core'

interface AssessmentEngineProps {
  session: AssessmentSession
  questions: SanitizedQuestion[]
  onComplete: (results: SubmissionResult) => void
  onError: (error: string) => void
}

export function AssessmentEngine({ session, questions, onComplete, onError }: AssessmentEngineProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHonorCode, setShowHonorCode] = useState(session.assessmentType === 'certification')
  const [honorCodeAccepted, setHonorCodeAccepted] = useState(false)
  const [violations, setViolations] = useState<HonorCodeViolation[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  
  const questionStartTime = useRef<number>(Date.now())
  const assessmentStartTime = useRef<number>(Date.now())
  const autoSaveInterval = useRef<NodeJS.Timeout | undefined>(undefined)

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  const recordViolation = useCallback(async (type: string, severity: string, description: string): Promise<void> => {
    try {
      await recordViolationAction({
        sessionToken: session.token,
        violationType: type,
        severity,
        description,
        metadata: {
          question_index: currentQuestionIndex,
          timestamp: new Date().toISOString()
        }
      })

      const newViolation: HonorCodeViolation = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        type: type as HonorCodeViolationType,
        severity: severity as 'low' | 'medium' | 'high' | 'critical',
        timestamp: new Date().toISOString(),
        details: { description },
        automaticAction: severity === 'critical' ? 'terminate' : 'warning'
      }
      
      setViolations(prev => [...prev, newViolation])
    } catch (error) {
      console.error('Failed to record violation:', error)
    }
  }, [session.token, currentQuestionIndex, session.id])

  const saveProgress = useCallback(async (): Promise<void> => {
    if (!currentQuestion || answers[currentQuestion.id] === undefined) return

    const elapsedMs = Date.now() - questionStartTime.current
    const answerIndex = answers[currentQuestion.id]
    
    // Get the actual option ID from the selected answer index
    const selectedOption = currentQuestion.options?.[answerIndex]
    if (!selectedOption) {
      console.warn('No option found for answer index:', answerIndex)
      return
    }

    try {
      await submitAnswer({
        sessionId: session.token || session.id,
        questionKey: currentQuestion.questionKey || currentQuestion.id,
        selectedOptionId: selectedOption.id,
        elapsedMs
      })

      // Store time spent
      setTimeSpent((prev: Record<string, number>) => ({
        ...prev,
        [currentQuestion.id]: Math.floor(elapsedMs / 1000)
      }))
    } catch (error) {
      console.error('Error saving answer:', error)
    }
  }, [currentQuestion, answers, session.token, session.id])

  // Honor code enforcement for certification
  useEffect(() => {
    if (session.assessmentType === 'certification' && honorCodeAccepted) {
      // Request fullscreen for certification exams
      const enterFullscreen = async () => {
        try {
          await document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        } catch {
          console.warn('Fullscreen not supported or denied')
        }
      }

      enterFullscreen()

      // Exit fullscreen handler
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          setIsFullscreen(false)
          if (honorCodeAccepted && warningCount < 3) {
            setWarningCount(prev => prev + 1)
            recordViolation('window_blur', 'low', 'Exited fullscreen mode')
          }
        }
      }

      document.addEventListener('fullscreenchange', handleFullscreenChange)
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [session.assessmentType, honorCodeAccepted, warningCount, recordViolation])

  // Auto-save progress
  useEffect(() => {
    if (honorCodeAccepted) {
      autoSaveInterval.current = setInterval(() => {
        saveProgress()
      }, 30000) // Save every 30 seconds

      return () => {
        if (autoSaveInterval.current) {
          clearInterval(autoSaveInterval.current)
        }
      }
    }
  }, [honorCodeAccepted, saveProgress])

  const handleAnswerSelect = (answerIndex: number) => {
    if (!currentQuestion) return

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answerIndex
    }))
  }

  const handleNext = async (): Promise<void> => {
    if (!currentQuestion || answers[currentQuestion.id] === undefined) {
      onError('Please select an answer before proceeding')
      return
    }

    // Save current progress
    await saveProgress()

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      questionStartTime.current = Date.now()
    } else {
      // Assessment complete
      await handleSubmit()
    }
  }

  const handlePrevious = (): void => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      questionStartTime.current = Date.now()
    }
  }

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true)

    try {
      // Final save of current answer
      if (currentQuestion && answers[currentQuestion.id] !== undefined) {
        await saveProgress()
      }

      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }

      // Trigger parent handler to call v2/finalize API
      // Parent will get real results from server
      const placeholder: SubmissionResult = {
        sessionId: session.token,
        score: 0,
        passed: false,
        totalQuestions: questions.length,
        correctAnswers: 0,
        timeSpent: Math.floor((Date.now() - assessmentStartTime.current) / 1000),
        categoryBreakdown: [],
        detailedFeedback: {
          overallPerformance: '',
          strengths: [],
          areasForImprovement: [],
          recommendations: []
        },
        nextSteps: []
      }

      onComplete(placeholder)
    } catch (error) {
      console.error('Submission error:', error)
      onError('Failed to complete assessment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTimeExpired = (): void => {
    handleSubmit()
  }

  if (showHonorCode && !honorCodeAccepted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <span className="break-words">Honor Code Agreement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">
                ReadyCheck AI Certification Honor Code
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-blue-800">
                <p>By proceeding with this certification assessment, I agree to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 sm:ml-4">
                  <li className="break-words">Complete the assessment independently without external assistance</li>
                  <li className="break-words">Not use any reference materials, search engines, or AI tools</li>
                  <li className="break-words">Not share questions or answers with others</li>
                  <li className="break-words">Not attempt to circumvent security measures</li>
                  <li className="break-words">Maintain focus on the assessment tab/window throughout</li>
                  <li className="break-words">Accept monitoring of my assessment behavior</li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-amber-800">
                  <p className="font-semibold mb-1">Security Monitoring Active</p>
                  <p>This assessment includes:</p>
                  <ul className="list-disc list-inside mt-1 ml-2 sm:ml-4 space-y-1">
                    <li className="break-words">Tab switching detection</li>
                    <li className="break-words">Copy/paste monitoring</li>
                    <li className="break-words">Timing analysis</li>
                    <li className="break-words">Browser focus tracking</li>
                  </ul>
                  <p className="mt-2 font-medium break-words">
                    Violations may result in assessment termination and account suspension.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  setHonorCodeAccepted(true)
                  setShowHonorCode(false)
                  assessmentStartTime.current = Date.now()
                  questionStartTime.current = Date.now()
                }}
                className="w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base"
              >
                I Accept the Honor Code and Begin Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!honorCodeAccepted && session.assessmentType === 'certification') {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {/* Honor Code Monitor */}
      {session.assessmentType === 'certification' && (
        <HonorCodeMonitor
          onViolation={recordViolation}
          warningCount={warningCount}
          maxWarnings={3}
        />
      )}

      {/* Assessment Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold break-words">
              {session.assessmentType === 'certification' 
                ? `${session.certificationLevel?.toUpperCase()} Certification Exam`
                : 'Practice Assessment'
              }
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <AssessmentTimer
              expiresAt={session.expiresAt}
              onTimeExpired={handleTimeExpired}
            />
          </div>
        </div>

        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mt-2 gap-2">
          <span className="truncate">Progress: {Math.round(progress)}%</span>
          <span className="whitespace-nowrap">Answered: {answeredCount}/{questions.length}</span>
        </div>
      </div>

      {/* Violation Warnings */}
      {violations.length > 0 && session.assessmentType === 'certification' && (
        <Card className="mb-4 sm:mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-base">
                Honor Code Violations Detected: {violations.length}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-700 mt-1">
              Continued violations may result in assessment termination.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          selectedAnswer={answers[currentQuestion.id]}
          onAnswerSelect={handleAnswerSelect}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-4 sm:mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isSubmitting}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          Previous
        </Button>

        <div className="flex gap-2 order-1 sm:order-2">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!currentQuestion || answers[currentQuestion.id] === undefined || isSubmitting}
              className="w-full sm:w-auto px-6 sm:px-8"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!currentQuestion || answers[currentQuestion.id] === undefined || isSubmitting}
              className="w-full sm:w-auto"
            >
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Info */}
      <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-600">
        {session.assessmentType === 'certification' && (
          <div className="space-y-1">
            <p className="px-2">This is a proctored certification exam. All activity is monitored.</p>
            {isFullscreen && <p className="text-green-600 mt-1">✓ Fullscreen mode active</p>}
            {Object.keys(timeSpent).length > 0 && (
              <p className="mt-1">Time tracking: {Object.keys(timeSpent).length} questions timed</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AssessmentEngine
