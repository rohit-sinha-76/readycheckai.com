
'use client'

import { useState, useTransition } from 'react'
import { RoadmapContent, RoadmapDay } from '@/types/roadmap'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Circle, CheckCircle2, Clock, BookOpen, Code, Calendar, ExternalLink, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { updateTaskProgress } from '@/features/roadmap/actions'

interface RoadmapViewProps {
    roadmapId?: string
    content: RoadmapContent
    initialProgress?: Record<string, boolean>
}

export function RoadmapView({ roadmapId, content, initialProgress = {} }: RoadmapViewProps) {
    // Default to first week
    const [activeWeek, setActiveWeek] = useState<string>("week-1")
    const [progress, setProgress] = useState<Record<string, boolean>>(initialProgress)
    const [_isPending, startTransition] = useTransition()

    const toggleTask = (taskId: string) => {
        if (!roadmapId) return

        const newStatus = !progress[taskId]
        // Optimistic update
        setProgress(prev => ({ ...prev, [taskId]: newStatus }))

        startTransition(async () => {
            const result = await updateTaskProgress({
                roadmapId,
                taskId,
                completed: newStatus
            })
            if (!result.success) {
                // Revert on failure
                setProgress(prev => ({ ...prev, [taskId]: !newStatus }))
            }
        })
    }

    return (
        <div className="space-y-8">
            <Tabs defaultValue="schedule" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="schedule" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            Schedule
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="gap-2">
                            <Code className="w-4 h-4" />
                            Projects
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="gap-2">
                            <BookOpen className="w-4 h-4" />
                            Resources
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* SCHEDULE TAB */}
                <TabsContent value="schedule" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Sidebar Week Navigation */}
                        <div className="lg:col-span-1 space-y-2">
                            <h3 className="font-semibold mb-4 px-2">Weeks</h3>
                            {content.weeks.map((week) => (
                                <button
                                    key={week.weekNumber}
                                    onClick={() => setActiveWeek(`week-${week.weekNumber}`)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between",
                                        activeWeek === `week-${week.weekNumber}`
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <span>Week {week.weekNumber}</span>
                                    {activeWeek === `week-${week.weekNumber}` && (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Main Content Area */}
                        <div className="lg:col-span-3">
                            {content.weeks.map((week) => (
                                <div
                                    key={week.weekNumber}
                                    style={{ display: activeWeek === `week-${week.weekNumber}` ? 'block' : 'none' }}
                                    className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
                                >
                                    <div className="bg-muted/30 p-6 rounded-xl border">
                                        <h2 className="text-2xl font-bold mb-2">
                                            Week {week.weekNumber}: {week.goal}
                                        </h2>
                                        <p className="text-muted-foreground">
                                            Focus on completing daily tasks to master this week&apos;s concepts.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {week.days.map((day) => (
                                            <DayCard 
                                                key={day.dayNumber} 
                                                day={day} 
                                                progress={progress}
                                                onToggleTask={toggleTask}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* PROJECTS TAB */}
                <TabsContent value="projects" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {content.projects.map((project, _idx) => (
                            <Card key={_idx} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <CardTitle>{project.title}</CardTitle>
                                        <Badge variant="outline">{project.difficulty}</Badge>
                                    </div>
                                    <CardDescription>
                                        Starts Week {project.weekToStart} • {project.estimatedHours} hours
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    <p className="text-sm text-foreground/80">{project.description}</p>

                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold">Learning Objectives:</h4>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            {project.learningObjectives.map((obj, i) => (
                                                <li key={i}>{obj}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* RESOURCES TAB */}
                <TabsContent value="resources" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {content.resources.map((resource, _idx) => (
                            <Link href={resource.url} key={_idx} target="_blank" className="block h-full">
                                <Card className="h-full hover:border-primary/50 transition-colors">
                                    <CardHeader>
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="secondary" className="capitalize">
                                                {resource.type}
                                            </Badge>
                                            {resource.isFree && (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                                                    Free
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-base line-clamp-2">
                                            {resource.title}
                                            <ExternalLink className="w-3 h-3 inline-block ml-2 align-top text-muted-foreground" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Recommended for Week {resource.relevantWeeks.join(', ')}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function DayCard({ 
    day, 
    progress, 
    onToggleTask 
}: { 
    day: RoadmapDay
    progress: Record<string, boolean>
    onToggleTask: (taskId: string) => void 
}) {
    if (day.isRestDay) {
        return (
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex items-center justify-center py-6 text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Day {day.dayNumber}: Rest Day - Take a break!
                    </span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={`day-${day.dayNumber}`} className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left">
                        <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0 shrink-0">
                            {day.dayNumber}
                        </Badge>
                        <div>
                            <h4 className="font-semibold text-base">{day.focus}</h4>
                            <p className="text-xs text-muted-foreground font-normal mt-0.5">
                                {day.tasks.length} tasks • ~{day.tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0)} mins
                            </p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-3">
                    {day.tasks.map((task) => (
                        <div key={task.id} className="flex gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                                className="mt-0.5 shrink-0 focus:outline-none transition-colors"
                                aria-label={progress[task.id] ? "Mark incomplete" : "Mark complete"}
                            >
                                {progress[task.id] ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                                )}
                            </button>
                            <div className={cn("space-y-1 transition-opacity", progress[task.id] && "opacity-60")}>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{task.title}</span>
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase tracking-wider">
                                        {task.type}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {task.description}
                                </p>
                                <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {task.estimatedMinutes} mins
                                </p>
                            </div>
                        </div>
                    ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
