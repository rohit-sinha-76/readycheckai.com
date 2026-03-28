import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Page header */}
          <div className="mb-8 space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Profile overview card */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />

              {/* Profile info */}
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-56" />
                <div className="flex gap-3 mt-4">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex-shrink-0 text-right">
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <Skeleton className="h-9 w-12 ml-auto" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-lg shadow-sm border border-border p-6"
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Certification progress */}
          <div className="mt-6 bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <Skeleton className="h-3.5 w-12" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
