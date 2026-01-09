import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Settings } from 'lucide-react'
import { getDashboardData } from '@/features/dashboard/actions'
import { StatsGrid } from '@/features/dashboard/components/StatsGrid'
import { CertificationJourney } from '@/features/dashboard/components/CertificationJourney'
import { RecentActivity } from '@/features/dashboard/components/RecentActivity'
import { LearningPath } from '@/features/dashboard/components/LearningPath'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { UpgradeBanner } from '@/features/dashboard/components/UpgradeBanner'

export const metadata: Metadata = {
  title: 'Dashboard | ReadyCheck AI',
  description: 'Track your AI certification progress, recent assessments, and learning path.',
}

export default async function DashboardPage() {
  const { user, certificationLevels, recentAssessments, stats } = await getDashboardData()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/assess/start">
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <StatsGrid stats={stats} user={user} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <CertificationJourney certificationLevels={certificationLevels} />
            <RecentActivity assessments={recentAssessments} />
          </div>

          <div className="space-y-0">
            <LearningPath plan={user.plan} />
            <QuickActions />
          </div>
        </div>

        <UpgradeBanner plan={user.plan} />
      </div>
    </div>
  )
}
