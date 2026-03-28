import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="bg-surface shadow-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Free check banner */}
            <div className="rounded-xl border-2 border-border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-6">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>

            {/* Certification journey */}
            <div className="rounded-xl border border-border p-6 space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-lg">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border border-border p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-14 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border p-6 space-y-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="rounded-xl border border-border p-6 space-y-3">
              <Skeleton className="h-5 w-28" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>

        {/* Upgrade banner */}
        <div className="mt-8 rounded-xl border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
