import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Info, XCircle, Clock } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Activity {
  id: string | number
  type: string
  message: string
  timestamp: string
  severity: 'info' | 'success' | 'warning' | 'error'
}

interface ActivityFeedProps {
  activities: Activity[]
  maxHeight?: string
}

const severityConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  }
}

export function ActivityFeed({ activities, maxHeight = '400px' }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest admin actions and system events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              activities.map((activity) => {
                const config = severityConfig[activity.severity]
                const Icon = config.icon
                
                return (
                  <div 
                    key={activity.id}
                    className={`p-3 border rounded-lg ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 ${config.textColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {activity.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{activity.timestamp}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {activity.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
