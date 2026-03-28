"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Avatar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center rounded-full bg-muted", className)}>
      {children}
    </div>
  )
}

export function AvatarImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || ""} className="h-full w-full rounded-full object-cover" />
}

export function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-xs", className)}>{children}</span>
}
