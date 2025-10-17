'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { resetPasswordSchema, getPasswordStrength, type ResetPasswordInput } from '@/contracts/auth'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState('')

  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Password strength indicator
  const passwordStrength = password ? getPasswordStrength(password) : null

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Check if user has a valid session (from email link click)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setTokenError('Invalid or expired reset link. Please request a new password reset.')
          setTokenValid(false)
        } else {
          setTokenValid(true)
        }
      } catch {
        setTokenError('Unable to validate reset link. Please try again.')
        setTokenValid(false)
      } finally {
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Client-side validation
      const validatedData = resetPasswordSchema.parse({
        password,
        confirmPassword
      }) as ResetPasswordInput

      // Update password via Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: validatedData.password
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Sign out after password reset for security
      await supabase.auth.signOut()

      setSuccess(true)
      toast.success('Password reset successful!')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)

    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err && Array.isArray((err as { errors: unknown[] }).errors)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any).errors[0]?.message || 'Invalid password')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to reset password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Token validation loading
  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600 mb-4"></div>
              <p className="text-sm text-gray-600">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token view
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Request New Link
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                {tokenError}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Password reset links expire after 1 hour for security reasons.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push('/auth/forgot-password')}
              >
                Request New Reset Link
              </Button>
              <p className="text-center text-sm text-gray-600">
                <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Back to Login
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success view
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-sm text-gray-600">
                  Your password has been updated successfully.
                </p>
                <p className="text-sm text-gray-500 mt-3">
                  Redirecting you to login...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary-600" />
            </div>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter new password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Password must contain:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li className={password.length >= 8 ? 'text-green-600' : ''}>
                      • At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                      • One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                      • One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                      • One number
                    </li>
                  </ul>
                </div>

                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password strength:</span>
                      <span className={`text-xs font-medium ${passwordStrength.strength === 'strong' ? 'text-green-600' :
                        passwordStrength.strength === 'medium' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                        {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.strength === 'strong' ? 'bg-green-600' :
                          passwordStrength.strength === 'medium' ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords don&apos;t match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              >
                {loading ? 'Resetting password...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-gray-500">
          By resetting your password, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
        </p>
      </div>
    </div>
  )
}
