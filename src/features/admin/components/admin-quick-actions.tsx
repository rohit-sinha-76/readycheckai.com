'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, Database, Settings, Server } from 'lucide-react'
import Link from 'next/link'

export function AdminQuickActions() {
  const actions = [
    {
      label: 'Add Question',
      description: 'Create new assessment question',
      icon: Plus,
      href: '/admin/questions/new',
      variant: 'default' as const
    },
    {
      label: 'Question Bank',
      description: 'Manage existing questions and categories',
      icon: Database,
      href: '/admin/questions',
      variant: 'outline' as const
    },
    {
      label: 'User Management',
      description: 'View users, roles, and permissions',
      icon: Users,
      href: '/admin/users',
      variant: 'outline' as const
    },
    {
      label: 'Database Management',
      description: 'View database stats and execute queries',
      icon: Server,
      href: '/admin/database',
      variant: 'outline' as const
    },
    {
      label: 'Platform Settings',
      description: 'Configure global system parameters',
      icon: Settings,
      href: '/admin/settings',
      variant: 'outline' as const
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-all"
              asChild
            >
              <Link href={action.href}>
                <div className="flex items-center gap-2 w-full">
                  <action.icon className="w-5 h-5" />
                  <span className="font-semibold">{action.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {action.description}
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
