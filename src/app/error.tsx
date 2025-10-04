'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-50 to-red-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-danger-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-danger-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-8">
            We encountered an unexpected error. Our team has been notified and is working to fix this issue.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-sm text-gray-800 mb-2">Error Details (Dev Mode)</h3>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {error.message}
              </pre>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Button onClick={reset} className="w-full flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If this problem persists, please{' '}
            <Link href="/support" className="text-primary-600 hover:underline">
              contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
