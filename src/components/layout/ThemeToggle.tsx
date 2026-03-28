'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-9 h-9 rounded-full"
      >
        <Sun className="h-4 w-4 text-foreground" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9 rounded-full transition-all duration-300 ease-in-out hover:bg-accent hover:scale-110 active:scale-95"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <div className="relative">
        <Sun
          className={`h-4 w-4 text-foreground transition-all duration-300 ease-in-out ${
            isDark ? 'rotate-180 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <Moon
          className={`absolute inset-0 h-4 w-4 text-foreground transition-all duration-300 ease-in-out ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'
          }`}
        />
      </div>
    </Button>
  )
}
