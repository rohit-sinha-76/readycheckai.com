/**
 * Generate Roadmap Form Component - Production Refactor
 * 
 * Architecture:
 * - shouldUnregister: true → Auto-cleanup of hidden fields
 * - No <form onSubmit> → Prevents premature submission
 * - form.watch('mode') → Single source of truth
 * - Explicit button onClick → Full submission control
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Sparkles, Clock, Target, BookOpen, Zap, ArrowRight, ArrowLeft, Check, Bot, GraduationCap, Rocket, Video, Code2, type LucideIcon } from 'lucide-react'
import {
    roadmapFormSchema,
    type RoadmapFormData,
    ROADMAP_DURATION_OPTIONS,
    getDurationLabel,
    getSkillLevelDescription,
    getLearningPaceDescription
} from '@/contracts/roadmap'
import { createRoadmap } from '@/features/roadmap/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import Label from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'

interface GenerateRoadmapFormProps {
    onSuccess: (roadmapId: string) => void
    onError?: (error: string) => void
}

const TOPIC_GROUPS: Array<{ icon: LucideIcon; label: string; topics: string[] }> = [
    {
        icon: Bot,
        label: 'ML / AI Fundamentals',
        topics: ['Machine Learning Basics', 'Deep Learning Fundamentals', 'Neural Networks', 'Natural Language Processing', 'Computer Vision'],
    },
    {
        icon: GraduationCap,
        label: 'Certifications',
        topics: ['Prepare for RCAF Certification', 'Prepare for RCAP Certification', 'Prepare for RCGS Certification', 'Prepare for RCSA Certification'],
    },
    {
        icon: Rocket,
        label: 'Specialized Topics',
        topics: ['Generative AI & LLMs', 'MLOps & Deployment', 'AI Ethics & Responsible AI', 'Reinforcement Learning', 'Time Series Analysis'],
    },
]

const LEARNING_STYLES: Array<{ value: 'video' | 'reading' | 'hands-on'; icon: LucideIcon; label: string; desc: string }> = [
    { value: 'video',    icon: Video,   label: 'Video',    desc: 'Tutorials & courses' },
    { value: 'reading',  icon: BookOpen, label: 'Reading',  desc: 'Articles & docs' },
    { value: 'hands-on', icon: Code2,   label: 'Hands-on', desc: 'Build projects' },
]

export function GenerateRoadmapForm({ onSuccess, onError }: GenerateRoadmapFormProps) {
    const [step, setStep] = useState(1)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ⭐ ARCHITECTURE CHANGE 1: shouldUnregister + form-owned mode
    const form = useForm<RoadmapFormData>({
        resolver: zodResolver(roadmapFormSchema),
        shouldUnregister: false, // Retain field values when navigating between steps
        defaultValues: {
            mode: 'quick',
            durationDays: 30,
            learningGoal: '',
            skillLevel: 'intermediate',
            hoursPerDay: 2,
            daysPerWeek: 5,
            learningPace: 'moderate',
            learningStyles: ['hands-on'],
            specificTopics: [],
            careerGoal: 'job_ready',
            priorExperience: '',
            budgetPreference: 'budget_friendly',
        } as RoadmapFormData,
    })

    // ⭐ ARCHITECTURE CHANGE 2: Single source of truth
    const mode = form.watch('mode')
    const totalSteps = mode === 'quick' ? 2 : 3

    // ⭐ ARCHITECTURE CHANGE 3: Mode switching via form only
    const handleModeChange = (newMode: 'quick' | 'advanced') => {
        form.setValue('mode', newMode)
        setStep(1)
        // Advanced fields auto-unregister when switching to Quick!
    }

    // ⭐ ARCHITECTURE CHANGE 4: Clean submission (no guards needed)
    const onSubmit = async (data: RoadmapFormData) => {
        setIsGenerating(true)
        setError(null)

        try {
            const result = await createRoadmap(data)

            if (result.success && result.roadmapId) {
                onSuccess(result.roadmapId)
            } else {
                const errorMsg = result.error || 'Failed to generate roadmap'
                setError(errorMsg)
                onError?.(errorMsg)
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
            setError(errorMsg)
            onError?.(errorMsg)
        } finally {
            setIsGenerating(false)
        }
    }

    // Step navigation with validation
    const nextStep = async () => {
        let isValid = false

        if (step === 1) {
            // Step 1: Basic info (common to both modes)
            isValid = await form.trigger(['durationDays', 'learningGoal', 'skillLevel'] as const)
        } else if (step === 2) {
            // Step 2: Time commitment + mode-specific fields
            if (mode === 'advanced') {
                // Advanced mode includes pace and learning styles
                isValid = await form.trigger(['hoursPerDay', 'daysPerWeek', 'learningPace', 'learningStyles'] as const)
            } else {
                // Quick mode only has time commitment
                isValid = await form.trigger(['hoursPerDay', 'daysPerWeek'] as const)
            }
        } else {
            // No validation needed for final step
            isValid = true
        }

        if (isValid && step < totalSteps) {
            setStep(step + 1)
            setError(null)
        }
    }

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1)
            setError(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => handleModeChange('quick')}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${mode === 'quick'
                        ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${mode === 'quick' ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Zap className={`w-6 h-6 ${mode === 'quick' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">Quick Mode</h3>
                            <p className="text-sm text-muted-foreground mb-2">4-5 essential questions</p>
                            <p className="text-xs text-muted-foreground">~1 minute to complete</p>
                        </div>
                        {mode === 'quick' && (
                            <div className="absolute top-4 right-4">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('advanced')}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${mode === 'advanced'
                        ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${mode === 'advanced' ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Target className={`w-6 h-6 ${mode === 'advanced' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">Advanced Mode</h3>
                            <p className="text-sm text-muted-foreground mb-2">8-10 detailed questions</p>
                            <p className="text-xs text-muted-foreground">More personalized roadmap</p>
                        </div>
                        {mode === 'advanced' && (
                            <div className="absolute top-4 right-4">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-3">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div
                            className={`relative h-2 rounded-full transition-all duration-300 ${i + 1 === step
                                ? 'w-12 bg-primary'
                                : i + 1 < step
                                    ? 'w-8 bg-primary'
                                    : 'w-8 bg-muted'
                                }`}
                        >
                            {i + 1 < step && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                </div>
                            )}
                        </div>
                        {i < totalSteps - 1 && (
                            <div className="w-8 h-0.5 bg-muted" />
                        )}
                    </div>
                ))}
            </div>

            {/* ⭐ ARCHITECTURE CHANGE 5: No onSubmit, prevent Enter key */}
            <Form {...form}>
                <form
                    onKeyDown={(e) => {
                        // Prevent Enter key from submitting
                        if (e.key === 'Enter') e.preventDefault()
                    }}
                    className="space-y-8"
                >

                    {/* Step 1: Learning Goals */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <Card className="border-2">
                                <CardHeader className="space-y-1 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Learning Goals</CardTitle>
                                            <CardDescription className="text-sm mt-1">
                                                Tell us what you want to learn
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    {/* Duration */}
                                    <FormField
                                        control={form.control}
                                        name="durationDays"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">Roadmap Duration</FormLabel>
                                                <Select
                                                    onValueChange={(v) => field.onChange(parseInt(v))}
                                                    value={field.value?.toString()}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Select duration" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {ROADMAP_DURATION_OPTIONS.map((days) => (
                                                            <SelectItem key={days} value={days.toString()}>
                                                                {getDurationLabel(days)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    How long should your learning plan be?
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Learning Goal with Suggestions */}
                                    <FormField
                                        control={form.control}
                                        name="learningGoal"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">What do you want to learn?</FormLabel>
                                                <FormDescription className="mb-4">
                                                    Select a suggested topic or write your own custom goal
                                                </FormDescription>

                                                {/* Suggested Topics */}
                                                <div className="space-y-4 mb-6">
                                                    {TOPIC_GROUPS.map((group) => {
                                                        const GroupIcon = group.icon
                                                        return (
                                                            <div key={group.label}>
                                                                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3">
                                                                    <GroupIcon className="w-3.5 h-3.5" />
                                                                    {group.label}
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {group.topics.map((topic) => (
                                                                        <button
                                                                            key={topic}
                                                                            type="button"
                                                                            onClick={() => field.onChange(topic)}
                                                                            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                                                                                field.value === topic
                                                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                                                    : 'bg-background hover:bg-muted border-input hover:border-primary/50'
                                                                            }`}
                                                                        >
                                                                            {topic}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Custom Goal Input */}
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Or write your custom learning goal here..."
                                                        className="min-h-[100px] resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Skill Level */}
                                    <FormField
                                        control={form.control}
                                        name="skillLevel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">Your Current Skill Level</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        className="grid gap-4 mt-3"
                                                    >
                                                        {['beginner', 'intermediate', 'advanced'].map((level) => (
                                                            <label
                                                                key={level}
                                                                htmlFor={level}
                                                                className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === level
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                                    }`}
                                                            >
                                                                <RadioGroupItem value={level} id={level} className="mt-1" />
                                                                <div className="ml-4 flex-1">
                                                                    <div className="font-medium capitalize mb-1">{level}</div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {getSkillLevelDescription(level)}
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Step 2: Time Availability */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <Card className="border-2">
                                <CardHeader className="space-y-1 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Clock className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Time Availability</CardTitle>
                                            <CardDescription className="text-sm mt-1">
                                                How much time can you dedicate?
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    {/* Hours per day */}
                                    <FormField
                                        control={form.control}
                                        name="hoursPerDay"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between mb-4">
                                                    <FormLabel className="text-base font-semibold">Hours per Day</FormLabel>
                                                    <div className="px-4 py-2 rounded-lg bg-primary/10 font-semibold text-primary">
                                                        {field.value} {field.value === 1 ? 'hour' : 'hours'}
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <div className="px-2">
                                                        <Slider
                                                            value={[field.value]}
                                                            onValueChange={([v]) => field.onChange(v)}
                                                            min={0.5}
                                                            max={8}
                                                            step={0.5}
                                                            className="py-4"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    How many hours can you study each day?
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Days per week */}
                                    <FormField
                                        control={form.control}
                                        name="daysPerWeek"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between mb-4">
                                                    <FormLabel className="text-base font-semibold">Days per Week</FormLabel>
                                                    <div className="px-4 py-2 rounded-lg bg-primary/10 font-semibold text-primary">
                                                        {field.value} {field.value === 1 ? 'day' : 'days'}
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <div className="px-2">
                                                        <Slider
                                                            value={[field.value]}
                                                            onValueChange={([v]) => field.onChange(v)}
                                                            min={1}
                                                            max={7}
                                                            step={1}
                                                            className="py-4"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    How many days per week can you study?
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Learning Pace (Advanced Mode Only) */}
                                    {mode === 'advanced' && (
                                        <FormField
                                            control={form.control}
                                            name="learningPace"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-base font-semibold">Learning Pace</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            className="grid gap-4 mt-3"
                                                        >
                                                            {['fast', 'moderate', 'relaxed'].map((pace) => (
                                                                <label
                                                                    key={pace}
                                                                    htmlFor={`pace-${pace}`}
                                                                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === pace
                                                                        ? 'border-primary bg-primary/5'
                                                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                                        }`}
                                                                >
                                                                    <RadioGroupItem value={pace} id={`pace-${pace}`} className="mt-1" />
                                                                    <div className="ml-4 flex-1">
                                                                        <div className="font-medium capitalize mb-1">{pace}</div>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            {getLearningPaceDescription(pace)}
                                                                        </p>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {/* Learning Styles (Advanced Mode Only) */}
                                    {mode === 'advanced' && (
                                        <FormField
                                            control={form.control}
                                            name="learningStyles"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-base font-semibold">Preferred Learning Styles</FormLabel>
                                                    <FormDescription className="mb-4">Select all that apply</FormDescription>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        {LEARNING_STYLES.map((style) => {
                                                            const StyleIcon = style.icon
                                                            const isSelected = field.value?.includes(style.value)
                                                            return (
                                                                <button
                                                                    key={style.value}
                                                                    type="button"
                                                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                                        isSelected
                                                                            ? 'border-primary bg-primary/5'
                                                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                                    }`}
                                                                    onClick={() => {
                                                                        const current = field.value || []
                                                                        if (current.includes(style.value)) {
                                                                            field.onChange(current.filter(v => v !== style.value))
                                                                        } else {
                                                                            field.onChange([...current, style.value])
                                                                        }
                                                                    }}
                                                                >
                                                                    <StyleIcon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                                                                    <p className="font-medium text-center text-sm mb-0.5">{style.label}</p>
                                                                    <p className="text-xs text-center text-muted-foreground">{style.desc}</p>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Step 3: Advanced Options */}
                    {step === 3 && mode === 'advanced' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <Card className="border-2">
                                <CardHeader className="space-y-1 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Target className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Additional Preferences</CardTitle>
                                            <CardDescription className="text-sm mt-1">
                                                Help us personalize even more
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    {/* Career Goal */}
                                    <FormField
                                        control={form.control}
                                        name="careerGoal"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">Career Goal</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Select your goal" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="job_ready">Get Job Ready</SelectItem>
                                                        <SelectItem value="freelancing">Start Freelancing</SelectItem>
                                                        <SelectItem value="promotion">Get a Promotion</SelectItem>
                                                        <SelectItem value="hobby">Personal Interest / Hobby</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Budget Preference */}
                                    <FormField
                                        control={form.control}
                                        name="budgetPreference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">Resource Budget</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Select budget preference" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="free_only">Free Resources Only</SelectItem>
                                                        <SelectItem value="budget_friendly">Budget Friendly (Mix)</SelectItem>
                                                        <SelectItem value="no_limit">No Limit - Best Resources</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    What kind of learning resources should we include?
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Prior Experience */}
                                    <FormField
                                        control={form.control}
                                        name="priorExperience"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold">Prior Experience (Optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Tell us about any related experience, projects you've built, or courses you've taken..."
                                                        className="min-h-[100px] resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    This helps us avoid covering things you already know.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm text-destructive font-medium">{error}</p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={step === 1 || isGenerating}
                            className="h-12 px-6"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>

                        {step < totalSteps ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="h-12 px-8"
                            >
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            // ⭐ ARCHITECTURE CHANGE 6: Explicit onClick submission
                            <Button
                                type="button"
                                onClick={() => form.handleSubmit(onSubmit)()}
                                disabled={isGenerating}
                                className="h-12 px-8"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating Roadmap...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Roadmap
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div >
    )
}
