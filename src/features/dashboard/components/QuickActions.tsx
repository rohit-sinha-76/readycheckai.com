import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, Users } from 'lucide-react'

const QUICK_ACTIONS = [
  { href: '/assess/start', icon: Target, label: 'Take Assessment' },
  { href: '/results', icon: TrendingUp, label: 'View All Results' },
  { href: '/pricing', icon: Users, label: 'Invite Team Members' },
] as const

export function QuickActions() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {QUICK_ACTIONS.map(({ href, icon: Icon, label }) => (
          <Button key={href} variant="outline" className="w-full justify-start" asChild>
            <Link href={href}>
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
