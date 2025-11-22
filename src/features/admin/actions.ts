/**
 * ReadyCheck AI - Admin Security Helper Functions
 * Provides secure admin authentication and audit logging
 */

import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'superadmin'
  subscription_plan: string
  requires_2fa: boolean
  two_factor_enabled: boolean
}

export interface AdminActionLog {
  action: string
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// ============================================================================
// CORE ADMIN FUNCTIONS
// ============================================================================

/**
 * Check if user has admin access and return user profile
 * Throws error or redirects if not authorized
 */
export async function checkAdminAccess(
  requiredRole: 'admin' | 'superadmin' = 'admin'
): Promise<{ user: { id: string }; userProfile: AdminUser }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login?message=Authentication required')
  }

  // Get user profile with role
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, role, subscription_plan, requires_2fa, two_factor_enabled')
    .eq('id', user.id)
    .single()

  if (profileError || !userProfile) {
    redirect('/dashboard?error=Profile not found')
  }

  // Check role-based access
  const hasAccess = requiredRole === 'superadmin' 
    ? userProfile.role === 'superadmin'
    : ['admin', 'superadmin'].includes(userProfile.role)

  if (!hasAccess) {
    redirect('/dashboard?error=Insufficient permissions. Admin access required.')
  }

  // Check 2FA requirement for admins
  if (userProfile.requires_2fa && !userProfile.two_factor_enabled) {
    redirect('/settings/security?error=2FA setup required for admin access')
  }

  // Refresh admin session (30 min timeout) - graceful fallback if RPC doesn't exist
  try {
    const { error: sessionError } = await supabase.rpc('refresh_admin_session', { 
      p_user_id: user.id 
    })
    
    if (sessionError) {
      console.warn('[Admin] Session refresh skipped:', sessionError.message)
    }
  } catch {
    console.warn('[Admin] Session refresh function not available')
  }

  return { user, userProfile: userProfile as AdminUser }
}

/**
 * Quick check if user is admin (returns boolean, doesn't redirect)
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', targetUserId)
      .single()

    return userProfile ? ['admin', 'superadmin'].includes(userProfile.role) : false
  } catch {
    return false
  }
}

/**
 * Log admin action to audit_log table
 */
export async function logAdminAction(
  adminUserId: string,
  log: AdminActionLog
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminUserId,
        action: log.action,
        target_type: log.resourceType,
        target_id: log.resourceId,
        metadata: log.details,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log admin action:', error)
      Sentry.captureException(error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error logging admin action:', error)
    Sentry.captureException(error)
    return false
  }
}

/**
 * Require admin access wrapper for server actions
 */
export async function withAdminAccess<T>(
  action: (adminUser: AdminUser) => Promise<T>,
  requiredRole: 'admin' | 'superadmin' = 'admin'
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const { userProfile } = await checkAdminAccess(requiredRole)
    const data = await action(userProfile)
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Admin action failed'
    console.error('Admin action error:', error)
    Sentry.captureException(error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Check if user can perform specific admin action
 */
export async function canPerformAdminAction(
  adminUserId: string,
  action: string,
  _resourceType?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single()

    if (!userProfile) return false

    // Superadmin can do everything
    if (userProfile.role === 'superadmin') return true

    // Standard admin permissions matrix
    if (userProfile.role === 'admin') {
      const restrictedActions = [
        'DELETE_USER',
        'CHANGE_USER_ROLE',
        'SYSTEM_SETTINGS_UPDATE',
        'DATABASE_BACKUP'
      ]

      if (restrictedActions.includes(action)) {
        return false
      }

      return true
    }

    return false
  } catch {
    return false
  }
}

// ============================================================================
// NOTIFICATION & ALERTING
// ============================================================================

/**
 * Send admin notification for critical security events
 */
export async function sendAdminSecurityAlert(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical' = 'warning',
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Insert alert into system_alerts table
    const { error } = await supabase
      .from('system_alerts')
      .insert({
        title,
        message,
        severity,
        metadata,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to create security alert:', error)
      return false
    }

    // If critical, log to Sentry
    if (severity === 'critical') {
      Sentry.captureMessage(`SECURITY ALERT: ${title} - ${message}`, 'error')
    }

    return true
  } catch (error) {
    console.error('Error sending security alert:', error)
    return false
  }
}

/**
 * Get unread admin notifications count
 */
export async function getUnreadNotificationsCount(adminUserId: string): Promise<number> {
  try {
    const supabase = await createClient()

    const { count } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', adminUserId)
      .eq('read', false)

    return count || 0
  } catch (error) {
    console.error('Failed to get unread notifications count:', error)
    return 0
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Validate admin session (30 min timeout)
 */
export async function validateAdminSession(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data } = await supabase.rpc('validate_admin_session', { 
      p_user_id: userId 
    })

    return data === true
  } catch (error) {
    console.error('Failed to validate admin session:', error)
    return false
  }
}

/**
 * Get admin session expiration time
 */
export async function getAdminSessionExpiry(userId: string): Promise<Date | null> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('users')
      .select('admin_session_expires_at')
      .eq('id', userId)
      .single()

    return data?.admin_session_expires_at ? new Date(data.admin_session_expires_at) : null
  } catch (error) {
    console.error('Failed to get admin session expiry:', error)
    return null
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Supabase server client for admin operations
 */
export async function getAdminSupabaseClient() {
  return await createClient()
}

/**
 * Check if request is from admin route
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || 
         pathname.startsWith('/api/admin')
}

/**
 * Format admin action for logging
 */
export function formatAdminAction(
  action: string,
  resourceType?: string,
  resourceId?: string
): string {
  let formatted = action.toUpperCase().replace(/\s+/g, '_')
  if (resourceType) {
    formatted = `${resourceType.toUpperCase()}_${formatted}`
  }
  void resourceId
  return formatted
}
