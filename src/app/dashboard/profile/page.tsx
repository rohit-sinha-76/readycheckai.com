import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import ProfileForm from './profile-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Settings,
  Bell,
  Globe,
  Lock
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  subscription_plan: 'free' | 'pro'
  account_status: 'active' | 'suspended' | 'banned'
  created_at: string
  updated_at: string
  preferences: {
    email_notifications: boolean
    marketing_emails: boolean
    language: string
    timezone: string
  } | null
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

  // Get user profile
  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      full_name,
      subscription_plan,
      account_status,
      created_at,
      updated_at,
      preferences
    `)
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Failed to fetch user profile')
  }

  return profile as UserProfile
}

async function updateUserProfile(formData: FormData) {
  'use server'
  
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
    throw new Error('Unauthorized')
  }

  // Extract form data
  const fullName = formData.get('fullName') as string
  const emailNotifications = formData.get('emailNotifications') === 'true'
  const marketingEmails = formData.get('marketingEmails') === 'true'
  const language = formData.get('language') as string
  const timezone = formData.get('timezone') as string

  // Validate input
  if (!fullName || fullName.trim().length < 2) {
    throw new Error('Full name must be at least 2 characters')
  }

  if (fullName.trim().length > 100) {
    throw new Error('Full name must be less than 100 characters')
  }

  // Update user profile
  const { error } = await supabase
    .from('users')
    .update({
      full_name: fullName.trim(),
      preferences: {
        email_notifications: emailNotifications,
        marketing_emails: marketingEmails,
        language: language || 'en',
        timezone: timezone || 'UTC'
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('Profile update error:', error)
    throw new Error('Failed to update profile')
  }

  // Revalidate the page to show updated data
  revalidatePath('/dashboard/profile')
}

export default async function ProfilePage() {
  const userProfile = await getUserProfile()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-4">
            <User className="text-blue-600" />
            Profile Settings
          </h1>
          <p className="text-gray-600">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and communication preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm 
                  userProfile={userProfile} 
                  updateProfile={updateUserProfile}
                />
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge 
                    variant={userProfile.account_status === 'active' ? 'default' : 'destructive'}
                    className={
                      userProfile.account_status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : ''
                    }
                  >
                    {userProfile.account_status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plan</span>
                  <Badge 
                    variant="outline"
                    className={
                      userProfile.subscription_plan === 'pro' 
                        ? 'border-purple-200 text-purple-700' 
                        : 'border-gray-200 text-gray-700'
                    }
                  >
                    {userProfile.subscription_plan.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Member since</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-1 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userProfile.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-1 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile.full_name || 'Not set'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-1 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(userProfile.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Email Notifications</span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      userProfile.preferences?.email_notifications 
                        ? 'border-green-200 text-green-700' 
                        : 'border-gray-200 text-gray-600'
                    }
                  >
                    {userProfile.preferences?.email_notifications ? 'On' : 'Off'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Marketing Emails</span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      userProfile.preferences?.marketing_emails 
                        ? 'border-green-200 text-green-700' 
                        : 'border-gray-200 text-gray-600'
                    }
                  >
                    {userProfile.preferences?.marketing_emails ? 'On' : 'Off'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Language</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile.preferences?.language?.toUpperCase() || 'EN'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings Link */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800 mb-1">Security</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Manage your password and account security settings.
                    </p>
                    <a 
                      href="/dashboard/profile/security" 
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Update Security Settings →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
