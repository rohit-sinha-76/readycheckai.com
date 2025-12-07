/**
 * Generate Roadmap Page
 * 
 * Client component page that hosts the roadmap generation form.
 * Handles form submission and redirects to newly generated roadmap.
 */

'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { GenerateRoadmapForm } from '@/features/roadmap/components/GenerateRoadmapForm'
import { Button } from '@/components/ui/button'

export default function GenerateRoadmapPage() {
    const router = useRouter()

    const handleSuccess = (roadmapId: string) => {
        // Navigate to the new roadmap
        router.push(`/roadmap/${roadmapId}`)
    }

    const handleError = (error: string) => {
        console.error('Roadmap generation error:', error)
        // Error is already displayed in the form
    }

    return (
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {/* Back Button */}
            <Button variant="ghost" asChild>
                <Link href="/roadmap" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Roadmap
                </Link>
            </Button>

            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Generate Your Learning Roadmap</h1>
                <p className="text-muted-foreground">
                    Answer a few questions to get a personalized AI learning path tailored to your goals.
                </p>
            </div>

            {/* Form */}
            <GenerateRoadmapForm
                onSuccess={handleSuccess}
                onError={handleError}
            />
        </div>
    )
}
