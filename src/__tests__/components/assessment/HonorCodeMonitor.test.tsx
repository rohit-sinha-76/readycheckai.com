import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HonorCodeMonitor } from '@/features/assessment/components/HonorCodeMonitor'

describe('HonorCodeMonitor', () => {
  const mockOnViolation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset DOM state
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects tab switching violations', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate tab switch
    Object.defineProperty(document, 'hidden', { value: true })
    fireEvent(document, new Event('visibilitychange'))

    expect(mockOnViolation).toHaveBeenCalledWith(
      'tab_switch',
      'low',
      expect.stringContaining('Tab switched or window lost focus')
    )
  })

  it('detects copy/paste attempts', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate copy attempt using keyboard shortcut
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true })

    expect(mockOnViolation).toHaveBeenCalledWith(
      'copy_paste',
      'high',
      'Copy/paste keyboard shortcut: Ctrl+C'
    )
  })

  it('detects keyboard shortcuts for developer tools', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate F12 key press
    const f12Event = new KeyboardEvent('keydown', { 
      key: 'F12',
      bubbles: true 
    })
    const preventDefaultSpy = vi.spyOn(f12Event, 'preventDefault')
    
    fireEvent(document, f12Event)

    expect(mockOnViolation).toHaveBeenCalledWith(
      'dev_tools',
      'high',
      expect.stringContaining('Developer tools shortcut attempted: F12')
    )
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('detects Ctrl+Shift+I shortcut', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate Ctrl+Shift+I
    const ctrlShiftI = new KeyboardEvent('keydown', {
      key: 'I',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    })
    const preventDefaultSpy = vi.spyOn(ctrlShiftI, 'preventDefault')
    
    fireEvent(document, ctrlShiftI)

    expect(mockOnViolation).toHaveBeenCalledWith(
      'dev_tools',
      'high',
      expect.stringContaining('Developer tools shortcut attempted: I')
    )
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('prevents right-click context menu', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate right-click
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true })
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')
    
    fireEvent(document, contextMenuEvent)

    expect(mockOnViolation).toHaveBeenCalledWith(
      'dev_tools',
      'medium',
      'Right-click context menu attempted'
    )
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('escalates violation severity based on frequency', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // First tab switch - should be low severity
    Object.defineProperty(document, 'hidden', { value: true })
    fireEvent(document, new Event('visibilitychange'))
    
    expect(mockOnViolation).toHaveBeenCalledWith(
      'tab_switch',
      'low',
      expect.stringContaining('(1 times)')
    )

    // Multiple tab switches should increase severity
    for (let i = 0; i < 3; i++) {
      Object.defineProperty(document, 'hidden', { value: false })
      Object.defineProperty(document, 'hidden', { value: true })
      fireEvent(document, new Event('visibilitychange'))
    }

    expect(mockOnViolation).toHaveBeenCalledWith(
      'tab_switch',
      'high',
      expect.stringContaining('(4 times)')
    )
  })

  it('shows termination screen when max warnings reached', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={3}
        maxWarnings={3}
      />
    )

    expect(screen.getByText('Assessment Terminated')).toBeInTheDocument()
    expect(screen.getByText('Multiple honor code violations have been detected. Your assessment has been terminated.')).toBeInTheDocument()
  })

  it('detects large text selections', () => {
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Mock window.getSelection
    const mockSelection = {
      toString: () => 'This is a long text selection that exceeds 10 characters'
    }
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as unknown as Selection)

    // Simulate mouse up event
    fireEvent.mouseUp(document)

    expect(mockOnViolation).toHaveBeenCalledWith(
      'copy_paste',
      'medium',
      'Large text selection detected (potential copy attempt)'
    )
  })

  it('handles focus loss and regain correctly', () => {
    vi.useFakeTimers()
    
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate focus gain
    fireEvent.focus(window)
    
    // Advance time and simulate focus loss
    vi.advanceTimersByTime(2000)
    fireEvent.blur(window)

    expect(mockOnViolation).toHaveBeenCalledWith(
      'focus_loss',
      'low',
      expect.stringContaining('Window focus lost (1 times)')
    )

    vi.useRealTimers()
  })

  it('does not trigger violation for brief focus loss', () => {
    vi.useFakeTimers()
    
    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    // Simulate focus gain
    fireEvent.focus(window)
    
    // Brief focus loss (less than 1 second)
    vi.advanceTimersByTime(500)
    fireEvent.blur(window)

    expect(mockOnViolation).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('should handle null return from getSelection API without error', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue(null)

    render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    expect(() => fireEvent.mouseUp(document)).not.toThrow()
  })

  it('should cleanly remove event listeners when component unmounts', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(
      <HonorCodeMonitor
        onViolation={mockOnViolation}
        warningCount={0}
        maxWarnings={3}
      />
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalled()
  })
})
