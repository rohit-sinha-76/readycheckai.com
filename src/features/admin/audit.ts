import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function logAdminAction(payload: {
  adminId: string
  action: string
  targetType: string
  targetId: string
  reason: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const h = await headers()
  
  const { error } = await supabase.from('admin_audit_log').insert({
    admin_id: payload.adminId,
    action: payload.action,
    target_type: payload.targetType,
    target_id: payload.targetId,
    reason: payload.reason,
    metadata: payload.metadata,
    ip_address: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
    user_agent: h.get('user-agent'),
  })

  if (error) {
    console.error('AUDIT LOG FAILURE:', error)
  }
}
