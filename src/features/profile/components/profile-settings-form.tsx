'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  User, 
  Mail, 
  Globe, 
  Shield, 
  Trash2, 
  Eye, 
  EyeOff,
  ExternalLink,
  Briefcase
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { updateUserProfile, deleteUserAccount, checkPublicIdAvailability } from '@/features/profile/actions'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  public_id: z.string()
    .min(3, 'Public ID must be at least 3 characters')
    .max(30, 'Public ID must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscore, and hyphen allowed')
    .regex(/^[a-zA-Z0-9]/, 'Must start with a letter or number'),
  profile_is_public: z.boolean(),
  date_of_birth: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(255, 'Location too long').optional(),
  website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  linkedin_url: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  github_url: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
  job_title: z.string().max(100, 'Job title too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  industry: z.string().optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  timezone: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface User {
  id: string
  email: string
  full_name: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  public_id: string | null
  profile_is_public: boolean | null
  date_of_birth: string | null
  bio: string | null
  location: string | null
  website_url: string | null
  linkedin_url: string | null
  github_url: string | null
  job_title: string | null
  company: string | null
  industry: string | null
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
  timezone: string | null
  locale: string | null
  subscription_tier: string
  account_status: string
}

export function ProfileSettingsForm({ user }: { user: User }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [publicIdChecking, setPublicIdChecking] = useState(false)
  const [publicIdAvailable, setPublicIdAvailable] = useState<boolean | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user.full_name || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      public_id: user.public_id || '',
      profile_is_public: user.profile_is_public || false,
      date_of_birth: user.date_of_birth || '',
      bio: user.bio || '',
      location: user.location || '',
      website_url: user.website_url || '',
      linkedin_url: user.linkedin_url || '',
      github_url: user.github_url || '',
      job_title: user.job_title || '',
      company: user.company || '',
      industry: user.industry || '',
      experience_level: user.experience_level || undefined,
      timezone: user.timezone || '',
    },
  })

  const checkPublicId = async (publicId: string) => {
    if (publicId === user.public_id) {
      setPublicIdAvailable(true)
      return
    }

    if (publicId.length < 3) {
      setPublicIdAvailable(null)
      return
    }

    setPublicIdChecking(true)
    try {
      const available = await checkPublicIdAvailability(publicId)
      setPublicIdAvailable(available)
    } catch {
      setPublicIdAvailable(false)
    } finally {
      setPublicIdChecking(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    startTransition(async () => {
      try {
        await updateUserProfile(user.id, data)
        toast.success('Profile updated successfully!')
        router.refresh()
      } catch (error) {
        console.error('Profile update error:', error)
        toast.error('Failed to update profile. Please try again.')
      }
    })
  }

  const handleDeleteAccount = async () => {
    startTransition(async () => {
      try {
        await deleteUserAccount(deleteReason || 'No reason provided')
        toast.success('Account deletion request submitted. You will be contacted within 30 days.')
        router.push('/')
      } catch (error) {
        console.error('Account deletion error:', error)
        toast.error('Failed to submit deletion request. Please try again.')
      }
    })
  }

  const publicProfileUrl = user.public_id && user.profile_is_public 
    ? `${window.location.origin}/u/${user.public_id}` 
    : null

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="public">Public Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    {...form.register('full_name')}
                    placeholder="Enter your full name"
                  />
                  {form.formState.errors.full_name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...form.register('date_of_birth')}
                  />
                </div>

                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    {...form.register('first_name')}
                    placeholder="First name"
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    {...form.register('last_name')}
                    placeholder="Last name"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    {...form.register('location')}
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={form.watch('timezone')} 
                    onValueChange={(value) => form.setValue('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...form.register('bio')}
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.watch('bio')?.length || 0}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    {...form.register('job_title')}
                    placeholder="Software Engineer"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    {...form.register('company')}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={form.watch('industry')} 
                    onValueChange={(value) => form.setValue('industry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <Select 
                    value={form.watch('experience_level')} 
                    onValueChange={(value) => form.setValue('experience_level', value as ProfileFormData['experience_level'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public Profile Tab */}
        <TabsContent value="public" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Profile
              </CardTitle>
              <CardDescription>
                Manage your public profile visibility and custom ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile_is_public">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to other users
                  </p>
                </div>
                <Switch
                  id="profile_is_public"
                  checked={form.watch('profile_is_public')}
                  onCheckedChange={(checked) => form.setValue('profile_is_public', checked)}
                />
              </div>

              <Separator />

              <div>
                <Label htmlFor="public_id">Public ID</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <Input
                      id="public_id"
                      {...form.register('public_id')}
                      placeholder="your-unique-id"
                      onChange={(e) => {
                        form.setValue('public_id', e.target.value)
                        checkPublicId(e.target.value)
                      }}
                    />
                    {form.formState.errors.public_id && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.public_id.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    {publicIdChecking ? (
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : publicIdAvailable === true ? (
                      <Badge variant="secondary" className="text-green-600">Available</Badge>
                    ) : publicIdAvailable === false ? (
                      <Badge variant="destructive">Taken</Badge>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This will be your public profile URL: readycheck.ai/u/your-id
                </p>
              </div>

              {publicProfileUrl && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Your public profile:</p>
                  <a 
                    href={publicProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    {publicProfileUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Social Links</h4>
                
                <div>
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    {...form.register('website_url')}
                    placeholder="https://yourwebsite.com"
                    type="url"
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    {...form.register('linkedin_url')}
                    placeholder="https://linkedin.com/in/username"
                    type="url"
                  />
                </div>

                <div>
                  <Label htmlFor="github_url">GitHub</Label>
                  <Input
                    id="github_url"
                    {...form.register('github_url')}
                    placeholder="https://github.com/username"
                    type="url"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control who can see your information and achievements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show in Leaderboards</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your public ID on leaderboards instead of your name
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('profile_is_public')}
                    onCheckedChange={(checked) => form.setValue('profile_is_public', checked)}
                  />
                </div>

                <Separator />

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    What others can see
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your public ID (if profile is public)</li>
                    <li>• Certification achievements and scores</li>
                    <li>• Assessment completion statistics</li>
                    <li>• Bio and professional information (if provided)</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    What others cannot see
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your email address</li>
                    <li>• Your real name (unless you choose to share it)</li>
                    <li>• Practice assessment results</li>
                    <li>• Account settings and preferences</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email Address</Label>
                  <Input value={user.email} disabled />
                </div>

                <div>
                  <Label>Account Status</Label>
                  <Badge variant={user.account_status === 'active' ? 'default' : 'destructive'}>
                    {user.account_status}
                  </Badge>
                </div>

                <div>
                  <Label>Subscription</Label>
                  <Badge variant="outline" className="capitalize">
                    {user.subscription_tier}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto text-destructive hover:bg-destructive/10">
                    Request Account Deletion
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all data including assessment results, certificates, profile information, achievements, subscription and payment history, and all other account data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="my-4">
                    <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
                    <Textarea
                      id="delete-reason"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Help us improve by sharing why you're leaving..."
                      className="mt-1"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button 
                      onClick={() => void handleDeleteAccount()}
                      className="bg-destructive hover:bg-destructive/90 text-white"
                      disabled={isPending}
                    >
                      {isPending ? 'Processing...' : 'Delete Account'}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isPending || publicIdAvailable === false}
          className="w-full md:w-auto"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
