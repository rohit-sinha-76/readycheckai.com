import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Medal, Award } from 'lucide-react'
import { CERT_ICONS, STATUS_ICONS, STATUS_COLORS } from '@/features/dashboard/actions'
import type { EnrichedCertLevel } from '@/features/dashboard/actions'

interface CertificationJourneyProps {
  certificationLevels: EnrichedCertLevel[]
}

export function CertificationJourney({ certificationLevels }: CertificationJourneyProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Certification Journey
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/assess/start">Start Assessment</Link>
          </Button>
        </div>
        <CardDescription>
          Track your progress through ReadyCheck AI certification levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {certificationLevels.map((cert, index) => {
            const CertIcon = CERT_ICONS[cert.code] ?? Award
            const StatusIcon = STATUS_ICONS[cert.status] ?? STATUS_ICONS['default']
            const statusColor = STATUS_COLORS[cert.status] ?? STATUS_COLORS['locked']

            return (
              <div key={cert.code} className="relative">
                {index < certificationLevels.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                )}
                <div className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/40 transition-colors">
                  <div className={`rounded-full p-2 flex-shrink-0 ${statusColor}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CertIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-semibold text-foreground truncate">{cert.name}</h3>
                        {cert.status === 'earned' && (
                          <Medal className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        {cert.status === 'earned' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                            Certified · {cert.score}%
                          </span>
                        )}
                        {cert.status === 'available' && (
                          <Button size="sm" asChild>
                            <Link href={`/assess/start?level=${cert.code.toLowerCase()}&mode=certification`}>
                              Take Exam
                            </Link>
                          </Button>
                        )}
                        {cert.status === 'locked' && (
                          <span className="text-muted-foreground text-xs">
                            Requires: {cert.prerequisites.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{cert.description}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Attempts: {cert.attempts}/{cert.maxAttempts}</span>
                      <span>Cooldown: {cert.cooldownDays} days</span>
                      {cert.earnedDate && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Earned: {new Date(cert.earnedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
