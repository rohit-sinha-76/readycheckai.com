import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthUser {
  id: string
  email: string
  subscription_plan: 'free' | 'pro'
  account_status: 'active' | 'suspended' | 'banned'
}

export interface SessionValidation {
  user: AuthUser
  rateLimit: {
    remaining: number
    resetTime: number
  }
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export async function validateAuth(request: NextRequest): Promise<SessionValidation> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    }
  )

  // Get user from JWT
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized: Invalid or missing authentication token')
  }

  // Get user profile with subscription info
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, subscription_plan, account_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  if (profile.account_status !== 'active') {
    throw new Error(`Account ${profile.account_status}`)
  }

  // Rate limiting
  const clientId = user.id
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 100 // per minute

  const current = rateLimitStore.get(clientId)
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs })
    return {
      user: profile as AuthUser,
      rateLimit: { remaining: maxRequests - 1, resetTime: now + windowMs }
    }
  }

  if (current.count >= maxRequests) {
    throw new Error('Rate limit exceeded')
  }

  current.count++
  rateLimitStore.set(clientId, current)

  return {
    user: profile as AuthUser,
    rateLimit: { remaining: maxRequests - current.count, resetTime: current.resetTime }
  }
}

export async function validateSessionToken(sessionToken: string, userId: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined }
      },
    }
  )

  const { data: session, error } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !session) {
    throw new Error('Invalid or expired session token')
  }

  return session
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

export function createSuccessResponse<T extends Record<string, unknown>>(data: T, status: number = 200) {
  return NextResponse.json(
    { 
      ...data,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}
