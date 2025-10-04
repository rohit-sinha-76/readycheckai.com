import { Brain, Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-[80vh] bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          {/* Outer rotating ring */}
          <Loader2 className="absolute inset-0 w-full h-full text-primary/30 animate-spin" />
          {/* Inner pulsing icon */}
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Brain className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
          ReadyCheck AI
        </h2>
        <p className="text-sm text-muted-foreground animate-pulse">
          Securing environment and loading modules...
        </p>
      </div>
    </div>
  )
}
