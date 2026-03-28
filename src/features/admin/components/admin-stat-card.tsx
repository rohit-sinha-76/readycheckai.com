import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

const variantStyles = {
  default: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
  success: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
  warning: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
  danger: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
  info: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
}

const iconStyles = {
  default: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-purple-600'
}

export function AdminStatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description,
  variant = 'default' 
}: AdminStatCardProps) {
  return (
    <Card className={`border ${variantStyles[variant]} transition-all hover:shadow-lg`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">{value}</h3>
              {trend && (
                <Badge variant={trend.isPositive ? 'default' : 'destructive'} className="text-xs">
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${variantStyles[variant]}`}>
            <Icon className={`w-6 h-6 ${iconStyles[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
