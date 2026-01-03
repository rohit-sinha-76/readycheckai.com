import { Card, CardContent } from '@/components/ui/card'
import { DASHBOARD_STAT_CONFIGS } from '@/features/dashboard/actions'
import type { DashboardStats, DashboardUser } from '@/features/dashboard/actions'

interface StatsGridProps {
  stats: DashboardStats
  user: DashboardUser
}

export function StatsGrid({ stats, user }: StatsGridProps) {
  const statItems = DASHBOARD_STAT_CONFIGS(stats, user)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((stat: any) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{stat.change}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3 flex-shrink-0">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
