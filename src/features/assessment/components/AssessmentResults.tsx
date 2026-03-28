'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Award, Download, Share2, Clock, Target } from 'lucide-react'

interface AssessmentResultsProps {
  results: {
    session_id: string
    assessment_type: 'practice' | 'certification'
    certification_level?: string
    final_score: number
    passed?: boolean
    total_points_earned: number
    total_points_possible: number
    completed_at: string
  }
  certificate?: {
    certificate_code: string
    passed_at: string
    status: string
  }
  onRetakeAssessment?: () => void
  onViewCertificate?: (code: string) => void
}

export function AssessmentResults({ 
  results, 
  certificate, 
  onRetakeAssessment, 
  onViewCertificate 
}: AssessmentResultsProps) {
  const scorePercentage = results.final_score
  const isPassed = results.passed === true
  const isCertification = results.assessment_type === 'certification'

  const getScoreColor = () => {
    if (scorePercentage >= 80) return 'text-green-600'
    if (scorePercentage >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBgColor = () => {
    if (scorePercentage >= 80) return 'bg-green-50 border-green-200'
    if (scorePercentage >= 60) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          {isCertification ? 'Certification Results' : 'Assessment Complete'}
        </h1>
        <p className="text-gray-600">
          {isCertification && results.certification_level && 
            `${results.certification_level.toUpperCase()} Certification Exam`
          }
        </p>
      </div>

      {/* Main Results Card */}
      <Card className={`border-2 ${getScoreBgColor()}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isPassed ? (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-4xl font-bold mb-2">
            <span className={getScoreColor()}>{scorePercentage}%</span>
          </CardTitle>
          
          {isCertification && (
            <div className="flex justify-center">
              <Badge 
                variant={isPassed ? "default" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {isPassed ? 'PASSED' : 'NOT PASSED'}
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Score Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Score Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Points Earned:</span>
                  <span className="font-semibold">{results.total_points_earned}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Points:</span>
                  <span className="font-semibold">{results.total_points_possible}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Score:</span>
                  <span className={`font-semibold ${getScoreColor()}`}>
                    {scorePercentage}%
                  </span>
                </div>
              </div>
              <Progress value={scorePercentage} className="h-3" />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Assessment Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    Completed: {formatDate(results.completed_at)}
                  </span>
                </div>
                {isCertification && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Passing Score: 80%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Section */}
          {certificate && isPassed && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg text-blue-900">
                    Certification Earned!
                  </h3>
                  <p className="text-blue-700">
                    Certificate Code: {certificate.certificate_code}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => onViewCertificate?.(certificate.certificate_code)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Award className="w-4 h-4 mr-2" />
                  View Certificate
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}

          {/* Failed Certification Message */}
          {isCertification && !isPassed && (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <h3 className="font-semibold text-lg text-red-900 mb-2">
                Certification Not Achieved
              </h3>
              <p className="text-red-700 mb-4">
                You need a score of 80% or higher to pass this certification exam. 
                Review the study materials and try again when ready.
              </p>
              <div className="text-sm text-red-600">
                <p>• Minimum passing score: 80%</p>
                <p>• Your score: {scorePercentage}%</p>
                <p>• You may retake this exam after the cooldown period</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4">
            {!isCertification && onRetakeAssessment && (
              <Button onClick={onRetakeAssessment} variant="outline">
                Take Another Practice Assessment
              </Button>
            )}
            
            {isCertification && !isPassed && onRetakeAssessment && (
              <Button onClick={onRetakeAssessment} variant="outline">
                Review and Retake Later
              </Button>
            )}
            
            <Button onClick={() => window.location.href = '/dashboard'}>
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Math.round((results.total_points_earned / results.total_points_possible) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {results.total_points_earned}
              </div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {isCertification ? 'Certification' : 'Practice'}
              </div>
              <div className="text-sm text-gray-600">Assessment Type</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isCertification && isPassed && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Certification Complete</h4>
                  <p className="text-sm text-gray-600">
                    You&apos;ve successfully earned your certification. Share your achievement and continue learning!
                  </p>
                </div>
              </div>
            )}
            
            {!isCertification && (
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Ready for Certification?</h4>
                  <p className="text-sm text-gray-600">
                    Consider taking a formal certification exam to validate your skills officially.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Continue Learning</h4>
                <p className="text-sm text-gray-600">
                  Explore advanced topics and take more assessments to expand your AI knowledge.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
