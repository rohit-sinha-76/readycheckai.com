/**
 * Roadmap Main Page
 * 
 * Entry point for the AI Roadmap feature.
 * 
 * Behavior:
 * - If user has an active roadmap → Redirect to view it
 * - If no roadmap → Show welcome screen with generation option
 * - Check assessment requirements and generation limits
 */

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Target, Clock, BookOpen, AlertTriangle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { checkGenerationLimit, checkAssessmentRequirement } from '@/features/roadmap/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export const metadata: Metadata = {
    title: 'AI Learning Roadmap | ReadyCheck AI',
    description: 'Generate a personalized AI learning roadmap based on your skills and goals',
}

export default async function RoadmapPage() {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login?redirect=/roadmap')
    }

    // Check for active roadmap
    const { data: activeRoadmap } = await supabase
        .from('roadmaps')
        .select('id, duration_days, generated_at, expires_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    // If user has an active roadmap, redirect to view it
    if (activeRoadmap) {
        redirect(`/roadmap/${activeRoadmap.id}`)
    }

    // Check generation limit and assessment requirements
    const [limit, assessmentReq] = await Promise.all([
        checkGenerationLimit(user.id),
        checkAssessmentRequirement()
    ])

    // Get roadmap history count
    const { count: historyCount } = await supabase
        .from('roadmaps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

    const canGenerate = limit.canGenerate && assessmentReq.hasEnoughAssessments

    return (
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">AI-Powered Learning</span>
                </div>
                <h1 className="text-4xl font-bold">Your Personalized Learning Roadmap</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Get a customized 7-90 day learning plan tailored to your goals,
                    schedule, and assessment results.
                </p>
            </div>

            {/* Assessment Requirement Warning */}
            {!assessmentReq.hasEnoughAssessments && (
                <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                            <div className="space-y-2">
                                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                                    Complete Assessments First
                                </h3>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    To generate a personalized roadmap, please complete at least 1 assessment.
                                    This helps us identify your weak and strong areas for a tailored learning path.
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Progress
                                        value={(assessmentReq.completedCount / assessmentReq.minimumRequired) * 100}
                                        className="w-32 h-2"
                                    />
                                    <span className="text-sm text-yellow-600">
                                        {assessmentReq.completedCount}/{assessmentReq.minimumRequired} required
                                    </span>
                                </div>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                    💡 Tip: Complete {assessmentReq.recommendedCount} assessments for best results
                                </p>
                                <Button asChild className="mt-3" variant="outline">
                                    <Link href="/assessment">Take an Assessment</Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Generation Limit Info */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Monthly Generations</p>
                            <p className="text-sm text-muted-foreground">
                                {limit.remaining} of 2 remaining this month
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Progress
                                value={((2 - limit.used) / 2) * 100}
                                className="w-24 h-2"
                            />
                            <Badge variant={limit.canGenerate ? 'secondary' : 'destructive'}>
                                {limit.used}/2 used
                            </Badge>
                        </div>
                    </div>
                    {!limit.canGenerate && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Resets on {limit.resetsOn.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <Target className="w-8 h-8 text-primary mb-2" />
                        <CardTitle className="text-lg">Personalized Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Based on your assessment results, focusing on your weak areas while building on strengths.
                        </CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <Clock className="w-8 h-8 text-primary mb-2" />
                        <CardTitle className="text-lg">Flexible Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Choose from 1 week to 3 months. Set your own pace and study schedule.
                        </CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <BookOpen className="w-8 h-8 text-primary mb-2" />
                        <CardTitle className="text-lg">Daily Tasks & Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Structured daily tasks, hands-on projects, and curated resources to guide your learning.
                        </CardDescription>
                    </CardContent>
                </Card>
            </div>

            {/* Generate Button */}
            <div className="flex flex-col items-center gap-4 py-8">
                {canGenerate ? (
                    <>
                        <Button asChild size="lg" className="text-lg px-8 py-6">
                            <Link href="/roadmap/generate">
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate My Roadmap
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Takes about 30 seconds to generate
                        </p>
                    </>
                ) : !assessmentReq.hasEnoughAssessments ? (
                    <Button asChild size="lg" variant="secondary">
                        <Link href="/assessment">
                            Complete an Assessment First
                        </Link>
                    </Button>
                ) : (
                    <div className="text-center">
                        <Button disabled size="lg">
                            Generation Limit Reached
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                            Resets on {limit.resetsOn.toLocaleDateString()}
                        </p>
                    </div>
                )}
            </div>

            {/* Previous Roadmaps Link */}
            {historyCount && historyCount > 0 && (
                <div className="text-center">
                    <Button variant="link" asChild>
                        <Link href="/roadmap/history">
                            View Previous Roadmaps ({historyCount})
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
