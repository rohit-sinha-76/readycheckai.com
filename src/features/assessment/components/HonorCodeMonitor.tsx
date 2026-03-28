'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'

interface HonorCodeMonitorProps {
  onViolation: (type: string, severity: string, description: string) => void
  warningCount: number
  maxWarnings: number
}

export function HonorCodeMonitor({ onViolation, warningCount, maxWarnings }: HonorCodeMonitorProps) {
  const focusLostCount = useRef(0)
  const copyPasteAttempts = useRef(0)
  const lastFocusTime = useRef(Date.now())
  const devToolsDetected = useRef(false)

  // Tab switching / focus loss detection
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      focusLostCount.current++
      const severity = focusLostCount.current > 3 ? 'high' : focusLostCount.current > 1 ? 'medium' : 'low'
      onViolation('tab_switch', severity, `Tab switched or window lost focus (${focusLostCount.current} times)`)
    }
  }, [onViolation])

  const handleFocusLoss = useCallback(() => {
    const now = Date.now()
    const timeSinceFocus = now - lastFocusTime.current
    
    if (timeSinceFocus > 1000) { // Only count if focus was lost for more than 1 second
      focusLostCount.current++
      const severity = focusLostCount.current > 5 ? 'high' : focusLostCount.current > 2 ? 'medium' : 'low'
      onViolation('focus_loss', severity, `Window focus lost (${focusLostCount.current} times)`)
    }
  }, [onViolation])

  const handleFocusGain = useCallback(() => {
    lastFocusTime.current = Date.now()
  }, [])

  // Copy/paste detection
  const handleCopyPaste = useCallback((event: ClipboardEvent) => {
    copyPasteAttempts.current++
    const severity = copyPasteAttempts.current > 3 ? 'critical' : copyPasteAttempts.current > 1 ? 'high' : 'medium'
    onViolation('copy_paste', severity, `Copy/paste attempt detected (${copyPasteAttempts.current} times)`)
    
    // Prevent the action
    event.preventDefault()
    return false
  }, [onViolation])

  // Developer tools detection
  const detectDevTools = useCallback(() => {
    const threshold = 160
    
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devToolsDetected.current) {
        devToolsDetected.current = true
        onViolation('dev_tools', 'critical', 'Developer tools detected')
      }
    } else {
      devToolsDetected.current = false
    }
  }, [onViolation])

  // Right-click context menu detection
  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault()
    onViolation('dev_tools', 'medium', 'Right-click context menu attempted')
    return false
  }, [onViolation])

  // Keyboard shortcut detection
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Detect common developer tool shortcuts
    const devToolsShortcuts = [
      { key: 'F12' },
      { key: 'I', ctrlKey: true, shiftKey: true }, // Ctrl+Shift+I
      { key: 'J', ctrlKey: true, shiftKey: true }, // Ctrl+Shift+J
      { key: 'C', ctrlKey: true, shiftKey: true }, // Ctrl+Shift+C
      { key: 'U', ctrlKey: true }, // Ctrl+U (view source)
    ]

    const isDevToolsShortcut = devToolsShortcuts.some(shortcut => 
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.shiftKey === !!shortcut.shiftKey
    )

    if (isDevToolsShortcut) {
      event.preventDefault()
      onViolation('dev_tools', 'high', `Developer tools shortcut attempted: ${event.key}`)
      return false
    }

    // Detect copy/paste shortcuts
    if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'v' || event.key === 'x')) {
      copyPasteAttempts.current++
      const severity = copyPasteAttempts.current > 3 ? 'critical' : 'high'
      onViolation('copy_paste', severity, `Copy/paste keyboard shortcut: Ctrl+${event.key.toUpperCase()}`)
      event.preventDefault()
      return false
    }
  }, [onViolation])

  // Mouse selection detection (for copy attempts)
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 10) {
      onViolation('copy_paste', 'medium', 'Large text selection detected (potential copy attempt)')
    }
  }, [onViolation])

  // Suspicious timing detection (placeholder for future enhancement)
  // const detectSuspiciousTiming = useCallback(() => {
  //   // This would be enhanced with actual question timing data
  //   // For now, just a placeholder for the concept
  // }, [])

  useEffect(() => {
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleFocusLoss)
    window.addEventListener('focus', handleFocusGain)
    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('paste', handleCopyPaste)
    document.addEventListener('cut', handleCopyPaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mouseup', handleMouseUp)

    // Developer tools detection interval
    const devToolsInterval = setInterval(detectDevTools, 1000)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleFocusLoss)
      window.removeEventListener('focus', handleFocusGain)
      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('paste', handleCopyPaste)
      document.removeEventListener('cut', handleCopyPaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mouseup', handleMouseUp)
      clearInterval(devToolsInterval)
    }
  }, [
    handleVisibilityChange,
    handleFocusLoss,
    handleFocusGain,
    handleCopyPaste,
    handleContextMenu,
    handleKeyDown,
    handleMouseUp,
    detectDevTools
  ])

  // Warning display
  if (warningCount >= maxWarnings) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card text-card-foreground border border-border p-8 rounded-lg shadow-xl text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Assessment Terminated</h2>
          <p className="text-foreground mb-4">
            Multiple honor code violations have been detected. Your assessment has been terminated.
          </p>
          <p className="text-sm text-muted-foreground">
            This incident has been logged and may affect your certification eligibility.
          </p>
        </div>
      </div>
    )
  }

  return null
}
