'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, User, MapPin, Monitor } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface LoginRecord {
  id: string
  user_email: string
  user_role: string
  login_time: string
  ip_address?: string
  user_agent?: string
  location?: string
}

interface LastLoginsModalProps {
  logins: LoginRecord[]
}

export function LastLoginsModal({ logins }: LastLoginsModalProps) {
  const [open, setOpen] = useState(false)

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      superadmin: { variant: 'destructive', label: 'Super Admin' },
      admin: { variant: 'default', label: 'Admin' },
      user: { variant: 'secondary', label: 'User' }
    }
    const config = roleMap[role.toLowerCase()] || { variant: 'outline' as const, label: role }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="w-4 h-4" />
          Recent Logins ({logins.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Recent Admin Logins</DialogTitle>
          <DialogDescription>
            Last {logins.length} admin login attempts and activities
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {logins.map((login) => (
              <div 
                key={login.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">{login.user_email}</span>
                  </div>
                  {getRoleBadge(login.user_role)}
                </div>
                
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(login.login_time).toLocaleString()}</span>
                  </div>
                  
                  {login.ip_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{login.ip_address}</span>
                      {login.location && <span className="text-gray-400">• {login.location}</span>}
                    </div>
                  )}
                  
                  {login.user_agent && (
                    <div className="flex items-center gap-2">
                      <Monitor className="w-3 h-3" />
                      <span className="truncate">{login.user_agent}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
