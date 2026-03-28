'use client'

import * as React from 'react'

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, style, ...props }, ref) => (
  <div
    ref={ref}
    className={`overflow-auto ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
))
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
