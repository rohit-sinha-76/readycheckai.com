import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Crown } from 'lucide-react'

interface LearningPathProps {
  plan: string
}

export function LearningPath({ plan }: LearningPathProps) {
  const isPro = plan === 'pro'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Learning Path
        </CardTitle>
        <CardDescription>
          Personalized recommendations based on your assessment results
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPro ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-1">Learning Path Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              Personalized recommendations will be available here based on your assessment performance.
            </p>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <Crown className="w-12 h-12 text-blue-400 mx-auto" />
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Unlock Your Learning Path</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized recommendations and progress tracking with Pro.
              </p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/pricing">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
