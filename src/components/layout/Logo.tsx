'use client'

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

interface LogoProps {
  mobile?: boolean
}

export function Logo({ mobile = false }: LogoProps) {
  return (
    <Link 
      className="flex items-center space-x-2 group transition-transform duration-200 hover:scale-105" 
      href="/"
    >
      <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400 transition-colors duration-300" />
      <span className={`font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300 ${
        mobile ? 'text-lg' : 'text-xl hidden sm:inline-block'
      }`}>
        {mobile ? 'RC AI' : 'ReadyCheck AI'}
      </span>
    </Link>
  )
}
