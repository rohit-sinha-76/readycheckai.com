import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Target, ArrowRight } from 'lucide-react'
import type { RecentAssessment } from '@/features/dashboard/actions'

interface RecentActivityProps {
  assessments: RecentAssessment[]
}

export function RecentActivity({ assessments }: RecentActivityProps) {
  if (assessments.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No completed assessments yet. Take your first assessment to see results here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assessments.map((assessment) => {
            const isCertification = assessment.type === 'certification'
            return (
              <div
                key={assessment.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 flex-shrink-0 ${
                    isCertification
                      ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {isCertification ? <Award className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {isCertification
                        ? `${assessment.certification_level} Certification`
                        : 'Practice Assessment'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(assessment.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-primary">{assessment.score}%</div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/assess/${assessment.id}/results`} className="text-xs">
                      View <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
