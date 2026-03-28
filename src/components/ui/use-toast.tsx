'use client'

import { useState, useCallback } from 'react'

interface Toast {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

// Simple toast implementation for this project
export function useToast() {
  const [, setToast] = useState<Toast | null>(null)

  const toast = useCallback(({ title, description, variant = 'default' }: Toast) => {
    // Simple browser alert for now - can be replaced with proper toast UI later
    const message = description ? `${title}: ${description}` : title
    
    if (variant === 'destructive') {
      alert(`Error: ${message}`)
    } else {
      alert(`Success: ${message}`)
    }
    
    setToast({ title, description, variant })
  }, [])

  return { toast }
}
