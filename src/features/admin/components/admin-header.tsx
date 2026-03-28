'use client'

import { Button } from '@/components/ui/button'
import { Settings, LogOut, User, Shield } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface AdminHeaderProps {
  userEmail: string
  userRole: string
  requires2FA?: boolean
  twoFactorEnabled?: boolean
}

export function AdminHeader({ userEmail, userRole, requires2FA, twoFactorEnabled }: AdminHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Admin Panel
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Internal Management System
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {requires2FA && !twoFactorEnabled && (
              <Badge variant="destructive" className="hidden sm:inline-flex">
                2FA Required
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{userEmail}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-gray-900">{userEmail}</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard">
                    <User className="w-4 h-4 mr-2" />
                    User Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {requires2FA && !twoFactorEnabled && (
                  <DropdownMenuItem asChild className="cursor-pointer text-red-600">
                    <Link href="/settings/security">
                      <Shield className="w-4 h-4 mr-2" />
                      Enable 2FA
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
