'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link 
        href="/admin" 
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-gray-900 transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
