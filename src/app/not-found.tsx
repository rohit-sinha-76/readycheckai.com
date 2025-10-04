import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-primary-100 rounded-full flex items-center justify-center">
            <Search className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-foreground/90 mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved to a different location.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Take Assessment
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help? <Link href="/support" className="text-primary-600 hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
