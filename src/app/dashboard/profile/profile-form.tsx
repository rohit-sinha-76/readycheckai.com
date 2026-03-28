'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Save, Check } from 'lucide-react'

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

interface ProfileFormProps {
  userProfile: UserProfile
  updateProfile: (formData: FormData) => Promise<void>
}

export default function ProfileForm({ userProfile, updateProfile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  // Form state
  const [fullName, setFullName] = useState(userProfile.full_name || '')
  const [emailNotifications, setEmailNotifications] = useState(
    userProfile.preferences?.email_notifications ?? true
  )
  const [marketingEmails, setMarketingEmails] = useState(
    userProfile.preferences?.marketing_emails ?? false
  )
  const [language, setLanguage] = useState(
    userProfile.preferences?.language || 'en'
  )
  const [timezone, setTimezone] = useState(
    userProfile.preferences?.timezone || 'UTC'
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSuccess(false)

    const formData = new FormData(event.currentTarget)
    
    startTransition(async () => {
      try {
        await updateProfile(formData)
        setIsSuccess(true)
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        })
        // Reset success state after 3 seconds
        setTimeout(() => setIsSuccess(false), 3000)
      } catch (error) {
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Failed to update profile",
          variant: "destructive",
        })
      }
    })
  }

  const isFormChanged = 
    fullName !== (userProfile.full_name || '') ||
    emailNotifications !== (userProfile.preferences?.email_notifications ?? true) ||
    marketingEmails !== (userProfile.preferences?.marketing_emails ?? false) ||
    language !== (userProfile.preferences?.language || 'en') ||
    timezone !== (userProfile.preferences?.timezone || 'UTC')

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={userProfile.email}
            disabled
            className="bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email cannot be changed here. Contact support if needed.
          </p>
        </div>

        <div>
          <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
            Full Name *
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
            minLength={2}
            maxLength={100}
            className="mt-1"
          />
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Communication Preferences</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
              Email Notifications
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              Receive notifications about assessment results and account updates
            </p>
          </div>
          <Switch
            id="emailNotifications"
            name="emailNotifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
          <input 
            type="hidden" 
            name="emailNotifications" 
            value={emailNotifications.toString()} 
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="marketingEmails" className="text-sm font-medium text-gray-700">
              Marketing Emails
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              Receive updates about new features, tips, and promotional offers
            </p>
          </div>
          <Switch
            id="marketingEmails"
            name="marketingEmails"
            checked={marketingEmails}
            onCheckedChange={setMarketingEmails}
          />
          <input 
            type="hidden" 
            name="marketingEmails" 
            value={marketingEmails.toString()} 
          />
        </div>
      </div>

      {/* Regional Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Regional Preferences</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="language" className="text-sm font-medium text-gray-700">
              Language
            </Label>
            <Select name="language" value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
              Timezone
            </Label>
            <Select name="timezone" value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end pt-6 border-t">
        <Button
          type="submit"
          disabled={isPending || !isFormChanged}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : isSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Updated!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {!isFormChanged && (
        <p className="text-xs text-gray-500 text-center">
          Make changes to enable the save button
        </p>
      )}
    </form>
  )
}
