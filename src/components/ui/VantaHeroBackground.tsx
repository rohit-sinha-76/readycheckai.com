'use client'

import { useEffect, useRef } from 'react'

interface VantaHeroBackgroundProps {
  children?: React.ReactNode
  className?: string
}

declare global {
  interface Window {
    THREE: any
    VANTA: any
  }
}

export function VantaHeroBackground({ children, className = '' }: VantaHeroBackgroundProps) {
  const vantaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vantaEffect: any = null
    let isMounted = true

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = (err) => reject(err)
        document.body.appendChild(script)
      })
    }

    const initVanta = async () => {
      try {
        // 1. Load Three.js r134 first
        if (!window.THREE) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
        }
        // 2. Load Vanta NET second
        if (!window.VANTA?.NET) {
          await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js')
        }

        if (isMounted && vantaRef.current && window.VANTA?.NET) {
          vantaEffect = window.VANTA.NET({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0xbe5279,
            backgroundColor: 0x170a2f,
            points: 11.00,
            maxDistance: 17.00,
            spacing: 13.00
          })
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Vanta NET background:', err)
      }
    }

    initVanta()

    return () => {
      isMounted = false
      if (vantaEffect && typeof vantaEffect.destroy === 'function') {
        vantaEffect.destroy()
      }
    }
  }, [])

  return (
    <div ref={vantaRef} className={`relative overflow-hidden ${className}`}>
      {children}
    </div>
  )
}
