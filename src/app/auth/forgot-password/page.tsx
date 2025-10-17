'use client'

import { useState } from 'react'
import Link from 'next/link'
import type React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/contracts/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Client-side validation
      const validatedData = forgotPasswordSchema.parse({ email }) as ForgotPasswordInput

      const supabase = getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        validatedData.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      )

      if (resetError) {
        // Check for rate limiting
        if (resetError.message.includes('rate limit') || resetError.message.includes('too many')) {
          setError('Too many reset attempts. Please wait 15 minutes before trying again.')
          setRateLimitRemaining(15 * 60) // 15 minutes in seconds
          startCountdown()
        } else {
          // Always show success for security (no user enumeration)
          setSuccess(true)
        }
      } else {
        // Always show success message (no user enumeration)
        setSuccess(true)
      }

    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err && Array.isArray((err as { errors: unknown[] }).errors)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any).errors[0]?.message || 'Invalid email address')
      } else {
        // Don't expose the actual error, show generic message
        setSuccess(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const startCountdown = () => {
    const interval = setInterval(() => {
      setRateLimitRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
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
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <CardTitle className="text-2xl">Forgot your password?</CardTitle>
            <CardDescription>
              No worries! Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                    {rateLimitRemaining !== null && (
                      <div className="mt-2 font-medium">
                        Try again in: {formatTime(rateLimitRemaining)}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your email"
                    required
                    autoFocus
                    disabled={loading || rateLimitRemaining !== null}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the email address associated with your account
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || rateLimitRemaining !== null}
                >
                  {loading ? 'Sending reset link...' : 'Send Reset Link'}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Check your email
                  </h3>
                  <p className="text-sm text-gray-600">
                    If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                  </p>
                  <p className="text-sm text-gray-500 mt-3">
                    The link will expire in 1 hour.
                  </p>
                </div>
                <div className="pt-4 space-y-2">
                  <p className="text-xs text-gray-500">
                    Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.
                  </p>
                </div>
              </div>
            )}

            {!success && (
              <div className="mt-6">
                <p className="text-center text-sm text-gray-600">
                  Remember your password?{' '}
                  <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-gray-500">
          Need help? Contact us at{' '}
          <a href="mailto:support@readycheckai.com" className="text-primary-600 hover:underline">
            support@readycheckai.com
          </a>
        </p>
      </div>
    </div>
  )
}
