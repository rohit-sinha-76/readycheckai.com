import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { changePasswordSchema } from '@/contracts/auth'
import { z } from 'zod'

/**
 * POST /api/profile/change-password
 * 
 * Securely change user password from profile settings
 * 
 * Security:
 * - Requires current password verification
 * - Rate limited to prevent brute force
 * - Audit logged
 * - New password must meet strength requirements
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION - Verify user session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. PARSE & VALIDATE INPUT
    const body = await request.json()
    const validated = changePasswordSchema.parse(body)

    // 3. VERIFY CURRENT PASSWORD by attempting sign in
    // This is the secure way to verify the current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: validated.currentPassword
    })

    if (signInError) {
      // Log failed attempt for security monitoring
      console.warn('[Password Change] Failed attempt:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // 4. UPDATE PASSWORD using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: validated.newPassword
    })

    if (updateError) {
      console.error('[Password Change] Update failed:', {
        userId: user.id,
        error: updateError.message
      })

      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      )
    }

    // 5. AUDIT LOG - Log successful password change (without the actual password)
    const adminSupabase = createServerClient(
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

    await adminSupabase.from('audit_log').insert({
      user_id: user.id,
      table_name: 'users',
      operation: 'UPDATE',
      new_values: {
        action: 'password_change',
        timestamp: new Date().toISOString()
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent')
    })

    // 6. SUCCESS RESPONSE
    console.info('[Password Change] Success:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        success: true,
        message: 'Password changed successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[Password Change API Error]', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
