// import { createClient } from '@/lib/supabase/server'
/*
import { Trophy, Medal, Award, TrendingUp, Users, Target, Calendar } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Badge component not currently used
// import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Leaderboard - ReadyCheck AI',
  description: 'Top performers in AI skills assessments and certifications.',
}

interface LeaderboardEntry {
  user_id: string
  profile_is_public: boolean
  full_name: string
  avatar_url: string | null
  score: number
  certification_level?: string
  achievement_date: string
  rank: number
}

async function getTopCertifications(): Promise<LeaderboardEntry[]> {
  const supabase = createClient()

  const { data: certifications, error } = await supabase
    .from('certificates')
    .select(`
      user_id,
      final_score,
      certification_level,
      passed_at,
      users!inner(
        profile_is_public,
        full_name,
        name,
        avatar_url
      )
    `)
    .eq('status', 'active')
    .gte('final_score', 70) // Only show certifications with 70%+ scores
    .order('final_score', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching top certifications:', error)
    return []
  }

  return certifications.map((cert: any, index) => {
    const user = Array.isArray(cert.users) ? cert.users[0] : cert.users
    return {
      user_id: cert.user_id,
      profile_is_public: user?.profile_is_public || false,
      full_name: user?.full_name || user?.name || 'Anonymous User',
      avatar_url: user?.avatar_url || null,
      score: cert.final_score,
      certification_level: cert.certification_level,
      achievement_date: cert.passed_at,
      rank: index + 1
    }
  })
}

async function getTopAssessmentScores(): Promise<LeaderboardEntry[]> {
  const supabase = createClient()

  const { data: sessions, error } = await supabase
    .from('assessment_sessions')
    .select(`
      user_id,
      final_score,
      completed_at,
      users!inner(
        profile_is_public,
        full_name,
        name,
        avatar_url
      )
    `)
    .eq('assessment_type', 'certification')
    .not('final_score', 'is', null)
    .order('final_score', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching top assessment scores:', error)
    return []
  }

  return sessions.map((session: any, index) => {
    const user = Array.isArray(session.users) ? session.users[0] : session.users
    return {
      user_id: session.user_id,
      profile_is_public: user?.profile_is_public || false,
      full_name: user?.full_name || user?.name || 'Anonymous User',
      avatar_url: user?.avatar_url || null,
      score: session.final_score,
      achievement_date: session.completed_at,
      rank: index + 1
    }
  })
}

async function getMonthlyTopPerformers(): Promise<LeaderboardEntry[]> {
  const supabase = createClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: sessions, error } = await supabase
    .from('assessment_sessions')
    .select(`
      user_id,
      final_score,
      completed_at,
      users!inner(
        profile_is_public,
        full_name,
        name,
        avatar_url
      )
    `)
    .eq('assessment_type', 'certification')
    .gte('completed_at', startOfMonth.toISOString())
    .not('final_score', 'is', null)
    .limit(100)

  if (error) {
    console.error('Error fetching monthly top performers:', error)
    return []
  }

  // Group by user and calculate average score
  const userScores = new Map<string, {
    user_id: string
    profile_is_public: boolean
    full_name: string
    avatar_url: string | null
    scores: number[]
    latest_date: string
  }>()

  sessions.forEach((session: any) => {
    const finalScore = session.final_score
    const user = Array.isArray(session.users) ? session.users[0] : session.users
    if (finalScore) {
      const userId = session.user_id
      if (!userScores.has(userId)) {
        userScores.set(userId, {
          user_id: session.user_id,
          profile_is_public: user?.profile_is_public || false,
          full_name: user?.full_name || user?.name || 'Anonymous User',
          avatar_url: user?.avatar_url || null,
          scores: [],
          latest_date: session.completed_at
        })
      }
      userScores.get(userId)!.scores.push(finalScore)
      userScores.get(userId)!.latest_date = session.completed_at
    }
  })

  return Array.from(userScores.values())
    .map(user => ({
      user_id: user.user_id,
      profile_is_public: user.profile_is_public,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      score: Math.round(user.scores.reduce((a, b) => a + b, 0) / user.scores.length),
      achievement_date: user.latest_date,
      rank: 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
}

function getDisplayName(entry: LeaderboardEntry): string {
  // If profile is public, show full name
  if (entry.profile_is_public) {
    return entry.full_name
  }

  // If profile is private, show anonymous
  return 'Anonymous User'
}

function getInitials(entry: LeaderboardEntry): string {
  if (entry.profile_is_public) {
    return entry.full_name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
  }
  return 'AU' // Anonymous User
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
  }
}

function LeaderboardTable({ entries, showCertLevel = false }: { entries: LeaderboardEntry[], showCertLevel?: boolean }) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={`${entry.user_id}-${entry.achievement_date}`}
          className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${entry.rank <= 3
              ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'
              : 'bg-card hover:bg-muted/50'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8">
              {getRankIcon(entry.rank)}
            </div>

            <Avatar className="h-10 w-10">
              <AvatarImage
                src={entry.profile_is_public ? entry.avatar_url || undefined : undefined}
                alt={getDisplayName(entry)}
              />
              <AvatarFallback className="text-sm font-medium">
                {getInitials(entry)}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="font-medium">
                {getDisplayName(entry)}
              </div>
              {showCertLevel && entry.certification_level && (
                <div className="text-sm text-muted-foreground">
                  {entry.certification_level}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {entry.score}%
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(entry.achievement_date).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function LeaderboardPage() {
  const [topCertifications, topScores, monthlyTop] = await Promise.all([
    getTopCertifications(),
    getTopAssessmentScores(),
    getMonthlyTopPerformers()
  ])

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            Leaderboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Top performers in AI skills assessments and certifications. Compete with others and showcase your expertise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {topCertifications.length + topScores.length}+
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active Competitors
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {topCertifications.length > 0 ? Math.max(...topCertifications.map(c => c.score)) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Highest Score
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {monthlyTop.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This Month
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="certifications" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="certifications">Top Certifications</TabsTrigger>
            <TabsTrigger value="assessments">Best Assessment Scores</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value="certifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Certification Scores
                </CardTitle>
                <CardDescription>
                  Highest scores achieved in certification assessments (70%+ required)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topCertifications.length > 0 ? (
                  <LeaderboardTable entries={topCertifications} showCertLevel={true} />
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No certifications yet. Be the first!</p>
                    <Button className="mt-4" asChild>
                      <a href="/assess/start">Start Assessment</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Best Assessment Scores
                </CardTitle>
                <CardDescription>
                  Top individual assessment performances across all levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topScores.length > 0 ? (
                  <LeaderboardTable entries={topScores} />
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No assessment scores yet. Take your first assessment!</p>
                    <Button className="mt-4" asChild>
                      <a href="/assess/start">Start Assessment</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Top Performers
                </CardTitle>
                <CardDescription>
                  Best average scores this month - fresh competition every month!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTop.length > 0 ? (
                  <LeaderboardTable entries={monthlyTop} />
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No activities this month yet. Start competing!</p>
                    <Button className="mt-4" asChild>
                      <a href="/assess/start">Start Assessment</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Privacy & Leaderboards</h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Only users with public profiles appear on leaderboards. Your public ID is shown instead of your real name for privacy.
                You can control your visibility in <a href="/profile/settings" className="text-primary hover:underline">Profile Settings</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
*/

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Feature Temporarily Unavailable</h1>
        <p className="text-muted-foreground mb-6">
          The competition and leaderboard features are currently undergoing maintenance and upgrades.
          Please check back later.
        </p>
        <a href="/dashboard" className="text-primary hover:underline">
          Return to Dashboard
        </a>
      </div>
    </div>
  )
}
