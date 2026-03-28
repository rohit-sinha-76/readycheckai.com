'use client'

import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

interface AssessmentTimerProps {
  expiresAt: string
  onTimeExpired: () => void
}

export function AssessmentTimer({ expiresAt, onTimeExpired }: AssessmentTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const remaining = Math.max(0, expiry - now)
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true)
        onTimeExpired()
      }
      
      return Math.floor(remaining / 1000) // Convert to seconds
    }

    // Initial calculation
    const initialTime = calculateTimeRemaining()
    setTimeRemaining(initialTime)

    // Only set interval if not in test environment or if time is not already expired
    if (initialTime > 0) {
      const interval = setInterval(() => {
        const newTime = calculateTimeRemaining()
        setTimeRemaining(newTime)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [expiresAt, onTimeExpired, isExpired])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeRemaining <= 300) return 'text-red-600 dark:text-red-400' // Last 5 minutes
    if (timeRemaining <= 600) return 'text-amber-600 dark:text-amber-400' // Last 10 minutes
    return 'text-foreground'
  }

  const getBackgroundColor = () => {
    if (timeRemaining <= 300) return 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800/50'
    if (timeRemaining <= 600) return 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/50'
    return 'bg-muted/50 border-border'
  }

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 dark:bg-red-950/60 dark:border-red-800 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <span className="font-semibold text-red-700 dark:text-red-300">Time Expired</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${getBackgroundColor()}`}>
      <Clock className={`h-5 w-5 ${getTimerColor()}`} />
      <div className="text-right">
        <div className={`font-mono text-lg font-semibold ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="text-xs text-muted-foreground">remaining</div>
      </div>
    </div>
  )
}
