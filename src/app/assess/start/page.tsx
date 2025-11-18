/**
 * Assessment Start Page - Redesigned
 * Modern card-based UI with dark mode support
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Target,
  Trophy,
  BookOpen,
  Zap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Cpu,
  LayoutGrid,
  ShieldCheck
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { startAssessment as startAssessmentAction, getAssessmentOptions } from '@/features/assessment/actions'
import { Checkbox } from '@/components/ui/checkbox'

interface LevelStats {
  level: string
  total_questions: number
  categories: string[]
  difficulty_distribution: Record<string, number>
}

interface RecentSession {
  id: string
  certification_level: string
  assessment_type: string
  status: string
  final_score?: number
  passed?: boolean
  completed_at?: string
}

interface AssessmentPolicies {
  maxAttemptsPerLevel: number
  retakeCooldownMinutes: number
  perQuestionSeconds: number
  overallMinutes: number
}

interface BillingPlanInfo {
  slug: string
  name: string
  billingInterval: 'monthly' | 'yearly' | 'none'
  status: 'active' | 'coming_soon' | 'deprecated'
  maxFreeAiReadinessPer30d: number | null
  maxPracticePerLevelPer30d: number | null
}

interface BillingUsageInfo {
  windowStart: string
  windowEnd: string
  freeAiReadinessRunsLast30d: number
  practiceSessionsLast30dForLevel: number | null
  level: string | null
}

const LEVEL_INFO = {
  rcaf: {
    name: 'AI Foundations',
    description: 'Master fundamental AI concepts and basic applications',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-950/30',
    icon: Cpu,
    features: ['Core AI Concepts', 'ML Basics', 'Data Fundamentals']
  },
  rcap: {
    name: 'AI Practitioner',
    description: 'Apply AI skills in real-world scenarios',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-950/30',
    icon: Zap,
    features: ['Practical Implementation', 'Tool Proficiency', 'Project Experience']
  },
  rcgs: {
    name: 'GenAI Specialist',
    description: 'Expert in Generative AI and LLM technologies',
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-950/30',
    icon: ShieldCheck,
    features: ['LLM Mastery', 'Prompt Engineering', 'GenAI Applications']
  },
  rcsa: {
    name: 'AI Solutions Architect',
    description: 'Design enterprise AI strategies and architectures',
    color: 'from-orange-500 to-red-600',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-950/30',
    icon: LayoutGrid,
    features: ['Strategic Planning', 'Architecture Design', 'Enterprise Solutions']
  }
}

export default function AssessmentStartPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Initialize with default levels so they always show
  const [levelStats, setLevelStats] = useState<LevelStats[]>([
    { level: 'rcaf', total_questions: 30, categories: [], difficulty_distribution: {} },
    { level: 'rcap', total_questions: 40, categories: [], difficulty_distribution: {} },
    { level: 'rcgs', total_questions: 35, categories: [], difficulty_distribution: {} },
    { level: 'rcsa', total_questions: 50, categories: [], difficulty_distribution: {} }
  ])
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [policies, setPolicies] = useState<AssessmentPolicies | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [billingPlan, setBillingPlan] = useState<BillingPlanInfo | null>(null)
  const [billingUsage, setBillingUsage] = useState<BillingUsageInfo | null>(null)

  // Form state
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [selectedMode, setSelectedMode] = useState<'practice' | 'certification'>('practice')
  const [selectedCategory] = useState<string>('')
  const [questionCount] = useState(25)
  const [honorCodeAccepted, setHonorCodeAccepted] = useState(false)

  useEffect(() => {
    fetchAssessmentOptions()
    fetchBillingUsage()
  }, [])

  const fetchAssessmentOptions = async () => {
    try {
      const data = await getAssessmentOptions()
      const levels = data.availableLevels || []
      console.log('[Assessment Start] Loaded levels:', levels)
      setLevelStats(levels)
      setRecentSessions(data.recentSessions || [])
      setPolicies(data.policies || null)
    } catch (error) {
      console.error('Error fetching options:', error)
      // Set default levels if API fails
      setLevelStats([
        { level: 'rcaf', total_questions: 30, categories: [], difficulty_distribution: {} },
        { level: 'rcap', total_questions: 40, categories: [], difficulty_distribution: {} },
        { level: 'rcgs', total_questions: 35, categories: [], difficulty_distribution: {} },
        { level: 'rcsa', total_questions: 50, categories: [], difficulty_distribution: {} }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchBillingUsage = async (level?: string) => {
    try {
      const params = level ? `?level=${encodeURIComponent(level)}` : ''
      const response = await fetch(`/api/billing/usage${params}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      setBillingPlan(data.plan)
      setBillingUsage(data.usage)
    } catch (error) {
      console.error('[Assessment Start] Error fetching billing usage:', error)
    }
  }

  const startAssessment = async () => {
    if (!selectedLevel) {
      toast({
        title: 'Error',
        description: 'Please select a certification level',
        variant: 'destructive'
      })
      return
    }

    if (selectedMode === 'certification' && !honorCodeAccepted) {
      toast({
        title: 'Error',
        description: 'Please accept the honor code for certification assessments',
        variant: 'destructive'
      })
      return
    }

    setStarting(true)

    try {
      const sessionData = await startAssessmentAction({
        level: selectedLevel,
        count: questionCount,
        category: selectedCategory || undefined,
        mode: selectedMode
      })

      // Store session data in sessionStorage for the runner page
      sessionStorage.setItem(`assessment_${sessionData.sessionId}`, JSON.stringify(sessionData))

      // Navigate to assessment page immediately
      router.push(`/assess/${sessionData.sessionId}`)

      // Keep starting state true to prevent re-renders during navigation

    } catch (error) {
      console.error('Error starting assessment:', error)
      setStarting(false) // Only reset on error
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start assessment',
        variant: 'destructive'
      })
    }
  }

  const selectedLevelStats = levelStats.find(stats => stats.level.toLowerCase() === selectedLevel)
  const selectedLevelInfo = selectedLevel ? LEVEL_INFO[selectedLevel.toLowerCase() as keyof typeof LEVEL_INFO] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary-50/20 dark:to-primary-950/10">
        <div className="container mx-auto py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-foreground">Loading assessment options...</p>
              <p className="text-sm text-muted-foreground mt-2">Preparing your personalized experience</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary-50/20 dark:to-primary-950/10">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>AI Skills Assessment Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
            Start Your Assessment
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your certification level and begin your journey to AI mastery
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Level Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Certification Levels */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Target className="h-6 w-6 text-primary-600" />
                  Select Certification Level
                </CardTitle>
                <CardDescription>
                  Choose the level that matches your current AI expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {levelStats.map(stats => {
                    // Normalize level to lowercase to match LEVEL_INFO keys
                    const normalizedLevel = stats.level.toLowerCase()
                    const info = LEVEL_INFO[normalizedLevel as keyof typeof LEVEL_INFO]

                    // Skip if level info not found
                    if (!info) {
                      console.warn('[Level Card] Unknown level:', stats.level)
                      return null
                    }

                    const isSelected = selectedLevel === stats.level.toLowerCase()

                    return (
                      <button
                        key={stats.level}
                        onClick={() => setSelectedLevel(normalizedLevel)}
                        className={`group relative p-6 text-left rounded-xl border-2 transition-all duration-200 ${isSelected
                          ? 'border-primary-500 bg-gradient-to-br ' + info.color + ' text-white shadow-lg scale-105'
                          : 'border-border hover:border-primary-300 dark:hover:border-primary-700 bg-card hover:shadow-md'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-primary/10'}`}>
                            <info.icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-primary'}`} />
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <h3 className={`font-bold text-lg mb-2 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                          {info.name}
                        </h3>
                        <p className={`text-sm mb-4 ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                          {info.description}
                        </p>
                        <div className={`flex items-center gap-2 text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <BookOpen className="h-4 w-4" />
                          <span>{stats.total_questions} questions available</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Assessment Mode */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary-600" />
                  Assessment Mode
                </CardTitle>
                <CardDescription>
                  Choose between practice or official certification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Practice Mode */}
                  <button
                    onClick={() => setSelectedMode('practice')}
                    className={`p-6 rounded-xl border-2 text-left transition-all duration-200 ${selectedMode === 'practice'
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg'
                      : 'border-border hover:border-green-300 dark:hover:border-green-700 bg-card'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${selectedMode === 'practice' ? 'bg-green-500 text-white' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-lg">Practice Mode</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Unlimited attempts
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Immediate feedback
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        No time pressure
                      </li>
                    </ul>
                  </button>

                  {/* Certification Mode */}
                  <button
                    onClick={() => setSelectedMode('certification')}
                    className={`p-6 rounded-xl border-2 text-left transition-all duration-200 ${selectedMode === 'certification'
                      ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 shadow-lg'
                      : 'border-border hover:border-orange-300 dark:hover:border-orange-700 bg-card'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${selectedMode === 'certification' ? 'bg-orange-500 text-white' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                        <Trophy className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-lg">Certification</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-500" />
                        Official certificate
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        Timed assessment
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-500" />
                        Honor code enforced
                      </li>
                    </ul>
                  </button>
                </div>

                {/* Honor Code */}
                {selectedMode === 'certification' && (
                  <div className="mt-6 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="honor-code"
                        checked={honorCodeAccepted}
                        onCheckedChange={(checked) => setHonorCodeAccepted(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="honor-code" className="text-sm cursor-pointer">
                        <span className="font-semibold text-foreground">I accept the Honor Code</span>
                        <p className="text-muted-foreground mt-1">
                          I will complete this assessment independently without external assistance,
                          unauthorized resources, or AI tools. I understand that violations may result
                          in disqualification.
                        </p>
                      </label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Button */}
            <Button
              onClick={startAssessment}
              disabled={!selectedLevel || starting || (selectedMode === 'certification' && !honorCodeAccepted)}
              size="lg"
              className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {starting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Launching Assessment...
                </>
              ) : (
                <>
                  Start {selectedMode === 'certification' ? 'Certification' : 'Practice'} Assessment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Info & Stats */}
          <div className="space-y-6">
            {billingPlan && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-primary-600" />
                    Your plan
                  </CardTitle>
                  <CardDescription>
                    {billingPlan.name} plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {billingPlan.maxPracticePerLevelPer30d != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Practice per level (30 days)</span>
                      <span className="font-semibold">
                        Up to {billingPlan.maxPracticePerLevelPer30d} run
                        {billingPlan.maxPracticePerLevelPer30d === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                  {billingPlan.maxFreeAiReadinessPer30d != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Free AI readiness checks</span>
                      <span className="font-semibold">
                        {billingUsage
                          ? `${billingUsage.freeAiReadinessRunsLast30d}/${billingPlan.maxFreeAiReadinessPer30d}`
                          : `Up to ${billingPlan.maxFreeAiReadinessPer30d} per 30 days`}
                      </span>
                    </div>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full mt-1">
                    <Link href="/pricing">View Pro &amp; Team plans</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {/* Selected Level Details */}
            {selectedLevelInfo && selectedLevelStats && (
              <Card className={`border-2 shadow-lg ${selectedLevelInfo.bgLight} ${selectedLevelInfo.bgDark}`}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <selectedLevelInfo.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{selectedLevelInfo.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {selectedLevelInfo.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-2xl font-bold text-primary-600">{selectedLevelStats.total_questions}</div>
                      <div className="text-xs text-muted-foreground">Questions</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-2xl font-bold text-primary-600">{policies?.overallMinutes || 45}</div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Key Topics</h4>
                    <div className="space-y-1">
                      {selectedLevelInfo.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary-600" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {Object.keys(selectedLevelStats.difficulty_distribution).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Difficulty Mix</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedLevelStats.difficulty_distribution).map(([difficulty, count]) => (
                          <div key={difficulty} className="flex items-center justify-between text-xs">
                            <span className="capitalize text-muted-foreground">{difficulty}</span>
                            <Badge variant="secondary" className="text-xs">{count} questions</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Assessment Policies */}
            {policies && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-primary-600" />
                    Assessment Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max attempts</span>
                    <span className="font-semibold">{policies.maxAttemptsPerLevel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Retake cooldown</span>
                    <span className="font-semibold">{policies.retakeCooldownMinutes} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Time per question</span>
                    <span className="font-semibold">{policies.perQuestionSeconds}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pass threshold</span>
                    <span className="font-semibold">70%</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-primary-600" />
                    Recent Attempts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm uppercase">{session.certification_level}</span>
                        {session.passed !== undefined && (
                          <Badge variant={session.passed ? 'default' : 'destructive'} className="text-xs">
                            {session.passed ? 'Passed' : 'Failed'}
                          </Badge>
                        )}
                      </div>
                      {session.final_score !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Score: {session.final_score}%
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
