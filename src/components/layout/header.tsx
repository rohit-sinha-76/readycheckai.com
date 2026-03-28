'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Menu, X, User, LogOut, Settings } from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // Initial user fetch
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      setUser(null)
      setMenuOpen(false)
      // Soft redirect to home
      if (typeof window !== 'undefined') window.location.href = '/'
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Logout failed', e)
    }
  }

  interface NavItem {
    name: string
    href: string
    description: string
    highlight?: boolean
    badge?: string
    icon?: React.ComponentType<{ className?: string }>
  }

  const navigation: NavItem[] = [
    {
      name: 'How It Works',
      href: '/#how-it-works',
      description: '3-step process explanation'
    },
    {
      name: 'Assessment',
      href: '/dashboard',
      description: 'Start free AI readiness quiz',
      highlight: true,
      badge: 'Free'
    },
    { 
      name: 'Roadmap', 
      href: '/roadmap',
      description: 'Public roadmap and feature requests'
    },
    {
      name: 'Pricing',
      href: '/pricing',
      description: 'Plans starting from ₹1,499/month'
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex h-16 items-center justify-between">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center space-x-8">
            <Logo />
            <nav className="flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative text-sm font-medium transition-all duration-200 ${item.highlight
                      ? 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'
                      : 'text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400'
                    } group`}
                >
                  <span className="flex items-center space-x-1">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-xs px-2 py-1 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-600 transition-all duration-200 group-hover:w-full"></span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile Logo */}
          <div className="md:hidden">
            <Logo mobile />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 relative">
            <ThemeToggle />
            {!user ? (
              <>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                  asChild
                >
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button
                  className="bg-primary-600 hover:bg-primary-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                  asChild
                >
                  <Link href="/dashboard">Start Free Assessment</Link>
                </Button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-surface text-foreground ring-1 ring-border hover:bg-accent transition-colors"
                  aria-label="Open profile menu"
                >
                  <User className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-background shadow-lg py-1 z-50">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      href="/profile/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle />
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border">
            <div className="pt-4 space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 ${item.highlight
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-foreground hover:text-primary-600 hover:bg-surface'
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="flex items-center space-x-2">
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-xs px-2 py-1 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </Link>
              ))}

              <div className="pt-4 space-y-3 border-t border-border">
                {!user ? (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href="/auth/login">Login</Link>
                    </Button>
                    <Button
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                      asChild
                    >
                      <Link href="/dashboard">Start Free Assessment</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-3 text-base rounded-lg text-foreground hover:bg-surface"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" /> Profile / Dashboard
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start text-danger-600 hover:bg-danger-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
