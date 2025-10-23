import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProfileInfoCard } from '@/features/profile/components/ProfileInfoCard'

export const metadata = {
  title: 'Profile Settings - ReadyCheck AI',
  description: 'Manage your account settings and personal information.',
}

async function getUserProfile(userId: string) {
  const supabase = await createClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      full_name,
      name,
      company_name,
      role,
      account_status
    `)
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return user
}

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  const profile = await getUserProfile(user.id)
  
  if (!profile) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">
              Update your personal information and account details
            </p>
          </div>

          {/* Profile Info Card */}
          <ProfileInfoCard user={profile} />

          {/* Security Link */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Security Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Change your password and manage security options
                </p>
              </div>
              <Link
                href="/dashboard/profile/security"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Manage Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
