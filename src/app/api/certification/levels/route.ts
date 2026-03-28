import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth, createErrorResponse, createSuccessResponse } from '@/features/auth/actions'

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateAuth(request)
    
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

    // Get all active certification levels
    const { data: levels, error } = await supabase
      .from('certification_levels')
      .select('*')
      .eq('active', true)
      .order('level_code')

    if (error) {
      console.error('Error fetching certification levels:', error)
      return createErrorResponse('Failed to fetch certification levels', 500)
    }

    // Get user's certification progress
    const { data: userProgress, error: progressError } = await supabase
      .from('users')
      .select('certification_progress')
      .eq('id', user.id)
      .single()

    if (progressError) {
      console.error('Error fetching user progress:', progressError)
      return createErrorResponse('Failed to fetch user progress', 500)
    }

    // Get user's attempt counts
    const { data: attempts, error: attemptsError } = await supabase
      .from('certification_attempts')
      .select('level_code, attempt_number, status, passed, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
    }

    // Enhance levels with user-specific data
    const enhancedLevels = levels?.map(level => {
      const progress = userProgress?.certification_progress?.[level.level_code] || 'locked'
      const userAttempts = attempts?.filter(a => a.level_code === level.level_code) || []
      const lastAttempt = userAttempts[0]
      const attemptCount = userAttempts.length
      const passed = userAttempts.some(a => a.passed)

      return {
        ...level,
        user_progress: progress,
        attempt_count: attemptCount,
        max_attempts_reached: attemptCount >= level.max_attempts,
        last_attempt: lastAttempt,
        passed,
        available: progress === 'available' || progress === 'not_started' || (progress === 'completed' && !passed)
      }
    })

    return createSuccessResponse({
      levels: enhancedLevels || []
    })

  } catch (error) {
    console.error('Get certification levels error:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}
