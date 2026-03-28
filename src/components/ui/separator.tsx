"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type SeparatorProps = React.HTMLAttributes<HTMLHRElement>

export function Separator({ className, ...props }: SeparatorProps) {
  return <hr className={cn("my-4 border-border", className)} {...props} />
}
