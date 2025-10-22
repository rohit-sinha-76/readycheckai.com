import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { profileUpdateSchema } from '@/contracts/auth'
import { z } from 'zod'

/**
 * PATCH /api/profile/update
 * 
 * Update user profile information (name, company, job title)
 * 
 * Security:
 * - Requires authentication
 * - User can only update their own profile
 * - Input validation with Zod
 * - Audit logged
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. AUTHENTICATION - Verify user session
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. PARSE & VALIDATE INPUT
    const body = await request.json()
    const validated = profileUpdateSchema.parse(body)

    // 3. GET OLD VALUES FOR AUDIT LOG
    const { data: oldProfile } = await supabase
      .from('users')
      .select('full_name, company_name, role')
      .eq('id', user.id)
      .single()

    // 4. UPDATE PROFILE (Only update editable profile fields, never the RBAC role)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: validated.full_name,
        company_name: validated.company || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Profile Update] Database error:', {
        userId: user.id,
        error: updateError.message
      })

      return NextResponse.json(
        { error: 'Failed to update profile. Please try again.' },
        { status: 500 }
      )
    }

    // 5. AUDIT LOG - Log the change
    await supabase.from('audit_log').insert({
      user_id: user.id,
      table_name: 'users',
      operation: 'UPDATE',
      old_values: oldProfile,
      new_values: {
        full_name: validated.full_name,
        company_name: validated.company,
        role: validated.job_title
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent')
    })

    // 6. SUCCESS RESPONSE
    console.info('[Profile Update] Success:', {
      userId: user.id,
      email: user.email,
      changes: {
        full_name: oldProfile?.full_name !== validated.full_name,
        company_name: oldProfile?.company_name !== validated.company,
        role: oldProfile?.role !== validated.job_title
      }
    })

    return NextResponse.json(
      { 
        success: true,
        message: 'Profile updated successfully',
        data: {
          full_name: validated.full_name,
          company: validated.company,
          job_title: validated.job_title
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[Profile Update API Error]', error)

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
