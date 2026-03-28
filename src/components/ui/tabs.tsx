"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
}
const TabsContext = React.createContext<TabsContextValue | null>(null)

export function Tabs({ defaultValue, className, children }: { defaultValue: string; className?: string; children: React.ReactNode }) {
  const [value, setValue] = React.useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("inline-flex items-center rounded-md bg-muted p-1", className)}>{children}</div>
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext)!
  const active = ctx.value === value
  return (
    <button
      type="button"
      className={cn(
        "px-3 py-2 text-sm rounded-md transition-colors",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext)!
  if (ctx.value !== value) return null
  return <div className={cn(className)}>{children}</div>
}
