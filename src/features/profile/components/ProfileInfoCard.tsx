'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { User, Building, Briefcase } from 'lucide-react'
import { profileUpdateSchema, type ProfileUpdateInput } from '@/contracts/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

interface ProfileInfoCardProps {
  user: {
    full_name: string | null
    company_name?: string | null
    role?: string | null
  }
}

export function ProfileInfoCard({ user }: ProfileInfoCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: user.full_name || '',
      company: user.company_name || '',
      job_title: user.role || ''
    }
  })

  const onSubmit = async (data: ProfileUpdateInput) => {
    setLoading(true)

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      toast.success('Profile updated successfully!', {
        description: 'Your profile information has been saved.'
      })

      // Refresh the page to show updated data
      router.refresh()

    } catch (error) {
      console.error('[Profile Update Error]', error)
      toast.error('Failed to update profile', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
        <CardDescription>
          Update your personal and professional information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">
              Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="full_name"
                {...form.register('full_name')}
                placeholder="Enter your full name"
                className="pl-10"
              />
            </div>
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.full_name.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Your display name across the platform
            </p>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">
              Company
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="company"
                {...form.register('company')}
                placeholder="Your company name"
                className="pl-10"
              />
            </div>
            {form.formState.errors.company && (
              <p className="text-sm text-destructive">
                {form.formState.errors.company.message}
              </p>
            )}
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="job_title">
              Job Title
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="job_title"
                {...form.register('job_title')}
                placeholder="Your job title"
                className="pl-10"
              />
            </div>
            {form.formState.errors.job_title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.job_title.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              disabled={loading || !form.formState.isDirty}
              className="w-full sm:w-auto"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
