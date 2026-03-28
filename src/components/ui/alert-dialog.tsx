"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertDialogContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}
const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null)

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return <AlertDialogContext.Provider value={{ open, setOpen }}>{children}</AlertDialogContext.Provider>
}

export function AlertDialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(AlertDialogContext)!
  const child = React.Children.only(children)
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    (child.props as any)?.onClick?.(e)
    ctx.setOpen(true)
  }
  return asChild ? React.cloneElement(child, { onClick } as any) : (
    <button onClick={onClick}>{child}</button>
  )
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(AlertDialogContext)!
  if (!ctx.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => ctx.setOpen(false)} />
      <div className={cn("relative z-10 w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg")}>{children}</div>
    </div>
  )
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1 mb-4">{children}</div>
}
export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-2">{children}</div>
}
export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold leading-none tracking-tight">{children}</h3>
}
export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
export function AlertDialogAction({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const ctx = React.useContext(AlertDialogContext)!
  return (
    <button
      className={cn("inline-flex items-center rounded-md bg-destructive px-4 py-2 text-sm text-white", className)}
      onClick={() => { onClick?.(); ctx.setOpen(false) }}
    >
      {children}
    </button>
  )
}
export function AlertDialogCancel({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const ctx = React.useContext(AlertDialogContext)!
  return (
    <button
      className={cn("inline-flex items-center rounded-md border px-4 py-2 text-sm", className)}
      onClick={() => { onClick?.(); ctx.setOpen(false) }}
    >
      {children}
    </button>
  )
}
