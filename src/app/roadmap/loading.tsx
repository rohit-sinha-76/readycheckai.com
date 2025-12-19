import { Skeleton } from '@/components/ui/skeleton'

export default function RoadmapLoading() {
  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-28 rounded-md" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* Week navigation tabs */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md flex-shrink-0" />
        ))}
      </div>

      {/* Week content */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border p-6 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Days */}
        {Array.from({ length: 5 }).map((_, dayIdx) => (
          <div key={dayIdx} className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Tasks */}
            <div className="space-y-3 pl-11">
              {Array.from({ length: dayIdx === 2 ? 2 : 3 }).map((_, taskIdx) => (
                <div key={taskIdx} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Skeleton className="h-5 w-5 rounded flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3.5 w-full" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Projects + Resources row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="space-y-2 p-4 border border-border rounded-lg">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
