import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield, ArrowLeft } from 'lucide-react'
import { ProfileInfoCard } from '@/features/profile/components/ProfileInfoCard'
import { PasswordChangeCard } from '@/features/profile/components/PasswordChangeCard'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  role: string | null
  subscription_plan: 'free' | 'pro'
  account_status: 'active' | 'suspended' | 'banned'
  created_at: string
}

async function getUserProfile(): Promise<UserProfile> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user profile using actual users schema (no first_name/last_name/company/job_title)
  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      full_name,
      company_name,
      role,
      subscription_plan,
      account_status,
      created_at
    `)
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching user profile in security page:', error)
    throw new Error('Failed to fetch user profile')
  }

  return profile as UserProfile
}

export const metadata = {
  title: 'Security Settings - ReadyCheck AI',
  description: 'Manage your account security and profile information',
}

export default async function SecuritySettingsPage() {
  const userProfile = await getUserProfile()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-4">
            <Shield className="text-blue-600" />
            Security Settings
          </h1>
          <p className="text-gray-600">
            Update your profile information and manage your account security
          </p>
        </div>

        {/* Security Info Banner */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Account Security</h4>
                <p className="text-sm text-blue-800">
                  Your account security is important to us. Keep your password strong and unique.
                  You&apos;ll need to enter your current password to make any changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Profile Information Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Profile Information</h2>
            <ProfileInfoCard
              user={{
                full_name: userProfile.full_name,
                company_name: userProfile.company_name,
                role: userProfile.role
              }}
            />
          </div>

          {/* Password Change Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Change Password</h2>
            <PasswordChangeCard />
          </div>

          {/* Email Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium text-gray-900 mb-2">Email Address</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your email address is: <span className="font-medium text-gray-900">{userProfile.email}</span>
              </p>
              <p className="text-xs text-gray-500">
                To change your email address, please contact support at support@readycheck.ai
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
