'use client'

import { useEffect, useRef } from 'react'

interface AINeuralBackgroundProps {
  children?: React.ReactNode
  className?: string
}

export function AINeuralBackground({ children, className = '' }: AINeuralBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Accessibility: Respect prefers-reduced-motion
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      return
    }

    let animationFrameId: number
    let isMounted = true
    let isPaused = false

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

    const initThree = async () => {
      try {
        if (!window.THREE) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
        }

        if (!isMounted || !canvasRef.current || !containerRef.current || !window.THREE) return

        const THREE = window.THREE

        // Scene setup
        const scene = new THREE.Scene()
        
        // Camera setup
        const width = containerRef.current.clientWidth || window.innerWidth
        const height = containerRef.current.clientHeight || window.innerHeight
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
        camera.position.z = 300

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

        // Device-adaptive particle count (Lightweight for mobile)
        const isMobile = window.innerWidth < 768
        const nodeCount = isMobile ? 35 : 75
        const nodePositions = new Float32Array(nodeCount * 3)
        const nodeVelocities: { x: number; y: number; z: number }[] = []
        const maxDistance = isMobile ? 60 : 75

        for (let i = 0; i < nodeCount; i++) {
          const x = (Math.random() - 0.5) * 450
          const y = (Math.random() - 0.5) * 350
          const z = (Math.random() - 0.5) * 250

          nodePositions[i * 3] = x
          nodePositions[i * 3 + 1] = y
          nodePositions[i * 3 + 2] = z

          nodeVelocities.push({
            x: (Math.random() - 0.5) * 0.35,
            y: (Math.random() - 0.5) * 0.35,
            z: (Math.random() - 0.5) * 0.35
          })
        }

        // Particle Geometry & Points Material
        const particleGeometry = new THREE.BufferGeometry()
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3))

        const particleMaterial = new THREE.PointsMaterial({
          color: 0x60a5fa, // Light Cyan-Blue
          size: 4,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        })

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
        scene.add(particleSystem)

        // Dynamic Line Geometry for Connections
        const maxConnections = (nodeCount * (nodeCount - 1)) / 2
        const linePositions = new Float32Array(maxConnections * 6)
        const lineColors = new Float32Array(maxConnections * 6)

        const lineGeometry = new THREE.BufferGeometry()
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
        lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

        const lineMaterial = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending
        })

        const lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial)
        scene.add(lineSystem)

        // Mouse interaction (Throttled via lerp)
        let mouseX = 0
        let mouseY = 0
        let targetMouseX = 0
        let targetMouseY = 0

        const handleMouseMove = (event: MouseEvent) => {
          const rect = containerRef.current?.getBoundingClientRect()
          if (!rect) return
          targetMouseX = ((event.clientX - rect.left) / rect.width - 0.5) * 80
          targetMouseY = -((event.clientY - rect.top) / rect.height - 0.5) * 80
        }

        window.addEventListener('mousemove', handleMouseMove, { passive: true })

        // Handle Resize
        const handleResize = () => {
          if (!containerRef.current || !canvasRef.current) return
          const w = containerRef.current.clientWidth
          const h = containerRef.current.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }

        window.addEventListener('resize', handleResize, { passive: true })

        // Page Visibility API: Pause rendering when tab is hidden (Save GPU/battery)
        const handleVisibilityChange = () => {
          isPaused = document.hidden
          if (!isPaused && isMounted) {
            animationFrameId = requestAnimationFrame(animate)
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Animation Loop
        const animate = () => {
          if (!isMounted || isPaused) return

          // Smooth Mouse Lerp
          mouseX += (targetMouseX - mouseX) * 0.05
          mouseY += (targetMouseY - mouseY) * 0.05

          camera.position.x = mouseX
          camera.position.y = mouseY
          camera.lookAt(scene.position)

          const positions = particleGeometry.attributes.position.array as Float32Array

          // Update Particle Positions
          for (let i = 0; i < nodeCount; i++) {
            positions[i * 3] += nodeVelocities[i].x
            positions[i * 3 + 1] += nodeVelocities[i].y
            positions[i * 3 + 2] += nodeVelocities[i].z

            // Bounce on boundaries
            if (Math.abs(positions[i * 3]) > 225) nodeVelocities[i].x *= -1
            if (Math.abs(positions[i * 3 + 1]) > 175) nodeVelocities[i].y *= -1
            if (Math.abs(positions[i * 3 + 2]) > 125) nodeVelocities[i].z *= -1
          }

          particleGeometry.attributes.position.needsUpdate = true

          // Recompute Lines between Nearby Nodes
          let lineIndex = 0
          let colorIndex = 0

          for (let i = 0; i < nodeCount; i++) {
            for (let j = i + 1; j < nodeCount; j++) {
              const dx = positions[i * 3] - positions[j * 3]
              const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
              const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

              if (dist < maxDistance) {
                const alpha = 1 - dist / maxDistance

                // Segment Node A
                linePositions[lineIndex++] = positions[i * 3]
                linePositions[lineIndex++] = positions[i * 3 + 1]
                linePositions[lineIndex++] = positions[i * 3 + 2]

                // Segment Node B
                linePositions[lineIndex++] = positions[j * 3]
                linePositions[lineIndex++] = positions[j * 3 + 1]
                linePositions[lineIndex++] = positions[j * 3 + 2]

                // Color Gradient (Cyan to Violet Accent)
                const r = 0.23 + alpha * 0.4
                const g = 0.51 + alpha * 0.35
                const b = 0.96

                lineColors[colorIndex++] = r
                lineColors[colorIndex++] = g
                lineColors[colorIndex++] = b

                lineColors[colorIndex++] = r
                lineColors[colorIndex++] = g
                lineColors[colorIndex++] = b
              }
            }
          }

          lineGeometry.setDrawRange(0, lineIndex / 3)
          lineGeometry.attributes.position.needsUpdate = true
          lineGeometry.attributes.color.needsUpdate = true

          // Rotate System Slightly
          particleSystem.rotation.y += 0.0008
          lineSystem.rotation.y += 0.0008

          renderer.render(scene, camera)
          animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
          window.removeEventListener('mousemove', handleMouseMove)
          window.removeEventListener('resize', handleResize)
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          cancelAnimationFrame(animationFrameId)
          renderer.dispose()
          particleGeometry.dispose()
          particleMaterial.dispose()
          lineGeometry.dispose()
          lineMaterial.dispose()
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize AI Neural 3D background:', err)
      }
    }

    // Deferred non-blocking startup (Allow initial paint first)
    const timer = setTimeout(() => {
      initThree()
    }, 50)

    return () => {
      isMounted = false
      clearTimeout(timer)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-slate-950 ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      />
      {children}
    </div>
  )
}

