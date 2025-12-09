
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RoadmapView } from '@/features/roadmap/components/RoadmapView'
import { getRoadmapProgress } from '@/features/roadmap/actions'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Calendar, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export const metadata: Metadata = {
    title: 'Your Learning Roadmap | ReadyCheck AI',
    description: 'View your personalized AI-generated learning roadmap',
}

export default async function RoadmapDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/auth/login?redirect=/roadmap/${id}`)
    }

    // Fetch roadmap
    const { data: roadmap, error } = await supabase
        .from('roadmaps')
        .select('id, user_id, roadmap_content, duration_days, generation_mode, generated_at')
        .eq('id', id)
        .single()

    if (error || !roadmap) {
        console.error('Error fetching roadmap:', error)
        notFound()
    }

    // Verify ownership
    if (roadmap.user_id !== user.id) {
        // In a real app we might show 403, but notFound is safer for security
        notFound()
    }

    // Set as active if it's the latest one
    // (Optional logic, but good for UX)

    // Fetch initial progress
    const progressMap = await getRoadmapProgress(roadmap.id)
    const initialProgress = Object.fromEntries(progressMap.entries())

    return (
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
                        <Link href="/roadmap">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">Learning Roadmap</h1>
                        <Badge variant={roadmap.generation_mode === 'advanced' ? 'default' : 'secondary'}>
                            {roadmap.generation_mode === 'advanced' ? 'Advanced' : 'Quick'} Generate
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {roadmap.duration_days} Days Plan • Generated on {new Date(roadmap.generated_at).toLocaleDateString()}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Placeholder for future actions */}
                    <Button variant="outline" size="sm" disabled>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF (Coming Soon)
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <RoadmapView 
                roadmapId={roadmap.id}
                content={roadmap.roadmap_content} 
                initialProgress={initialProgress}
            />
        </div>
    )
}
