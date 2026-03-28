'use client'

import * as React from 'react'

type DropdownMenuContextType = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined)

const useDropdownMenu = () => {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error('useDropdownMenu must be used within DropdownMenu')
  }
  return context
}

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (isOpen) {
      const handleClickOutside = () => setIsOpen(false)
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])
  
  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const { isOpen, setIsOpen } = useDropdownMenu()
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      ref
    } as any)
  }
  
  return (
    <button
      ref={ref}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }
>(({ className, children, align = 'center', ...props }, ref) => {
  const { isOpen } = useDropdownMenu()
  
  if (!isOpen) return null
  
  return (
    <div
      ref={ref}
      className={`absolute top-full mt-1 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-lg ${
        align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild, ...props }, ref) => {
  const { setIsOpen } = useDropdownMenu()
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) onClick(e)
    setIsOpen(false)
  }
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      className: `relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 ${className}`
    } as any)
  }
  
  return (
    <div
      ref={ref}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`-mx-1 my-1 h-px bg-gray-200 ${className}`}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
