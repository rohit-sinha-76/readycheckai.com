'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { changePasswordSchema, getPasswordStrength, type ChangePasswordInput } from '@/contracts/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export function PasswordChangeCard() {
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const newPassword = form.watch('newPassword')
  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null

  const onSubmit = async (data: ChangePasswordInput) => {
    setLoading(true)

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password')
      }

      toast.success('Password changed successfully!', {
        description: 'Your password has been updated. Please use your new password for future logins.'
      })

      // Reset form
      form.reset()

    } catch (error) {
      console.error('[Password Change Error]', error)
      toast.error('Failed to change password', {
        description: error instanceof Error ? error.message : 'Please check your current password and try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure. You&apos;ll need your current password to make changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password *</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                {...form.register('currentPassword')}
                placeholder="Enter your current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                {...form.register('newPassword')}
                placeholder="Enter your new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.newPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}

            {/* Password Strength Indicator */}
            {passwordStrength && newPassword.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Password strength:</span>
                  <span className={`text-sm font-medium ${
                    passwordStrength.strength === 'strong' ? 'text-green-600 dark:text-green-400' :
                    passwordStrength.strength === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </span>
                </div>
                <Progress 
                  value={passwordStrength.score} 
                  className={
                    passwordStrength.strength === 'strong' ? '[&>div]:bg-green-500' :
                    passwordStrength.strength === 'medium' ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-red-500'
                  }
                />
                <ul className="text-xs text-muted-foreground space-y-1">
                  {passwordStrength.feedback.slice(0, 3).map((feedback, index) => (
                    <li key={index}>• {feedback}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...form.register('confirmPassword')}
                placeholder="Re-enter your new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Password Requirements
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Different from your current password</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || !form.formState.isValid}
              className="w-full sm:w-auto"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
