import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface UpgradeBannerProps {
  plan: string
}

/** Only renders for non-pro users. Returns null if already on Pro. */
export function UpgradeBanner({ plan }: UpgradeBannerProps) {
  if (plan === 'pro') return null

  return (
    <Card className="mt-8 border border-primary/20 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Ready to unlock your full potential?
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upgrade to get advanced analytics, team features, and personalized coaching.
            </p>
          </div>
          <Button asChild className="flex-shrink-0">
            <Link href="/pricing">
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
