import { getSupabaseServerClient } from '@/lib/supabase/server'

export type BillingInterval = 'monthly' | 'yearly' | 'none'
export type PlanStatus = 'active' | 'coming_soon' | 'deprecated'

export interface EffectivePlan {
  slug: string
  name: string
  description: string | null
  priceInPaise: number | null
  currency: string
  billingInterval: BillingInterval
  status: PlanStatus
  maxFreeAiReadinessPer30d: number | null
  maxPracticePerLevelPer30d: number | null
  includesCertificates: boolean
}

export interface UserPlanInfo {
  userId: string
  subscriptionPlan: 'free' | 'pro'
  planSlug: string
  plan: EffectivePlan
}

export interface UserUsageWindow {
  windowStart: string
  windowEnd: string
  freeAiReadinessRunsLast30d: number
  practiceSessionsLast30dForLevel: number | null
}

const FREE_TRACK_CODE = 'GENAI_FREE'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function getUserPlan(userId: string): Promise<UserPlanInfo> {
  const supabase = await getSupabaseServerClient()

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, subscription_plan, plan_slug')
    .eq('id', userId)
    .single()

  if (userError || !userRow) {
    console.error('[getUserPlan] Failed to load user profile', { userId, error: userError })
    throw new Error('Failed to load user plan')
  }

  const subscriptionPlan: 'free' | 'pro' = userRow.subscription_plan === 'pro' ? 'pro' : 'free'

  const inferredSlug = subscriptionPlan === 'pro'
    ? 'pro_individual_inr_monthly'
    : 'free'

  const planSlug: string = userRow.plan_slug || inferredSlug

  const { data: planRow, error: planError } = await supabase
    .from('plans')
    .select(
      `slug,
       name,
       description,
       price_in_paise,
       currency,
       billing_interval,
       status,
       max_free_ai_readiness_per_30d,
       max_practice_per_level_per_30d,
       includes_certificates`
    )
    .eq('slug', planSlug)
    .single()

  if (planError || !planRow) {
    console.error('[getUserPlan] Plan configuration not found', { userId, planSlug, error: planError })
    throw new Error('Plan configuration not found')
  }

  const plan: EffectivePlan = {
    slug: planRow.slug,
    name: planRow.name,
    description: planRow.description ?? null,
    priceInPaise: planRow.price_in_paise ?? null,
    currency: planRow.currency || 'INR',
    billingInterval: planRow.billing_interval as BillingInterval,
    status: planRow.status as PlanStatus,
    maxFreeAiReadinessPer30d: planRow.max_free_ai_readiness_per_30d ?? null,
    maxPracticePerLevelPer30d: planRow.max_practice_per_level_per_30d ?? null,
    includesCertificates: !!planRow.includes_certificates,
  }

  return {
    userId,
    subscriptionPlan,
    planSlug: plan.slug,
    plan,
  }
}

export async function getUserUsage(
  userId: string,
  options: { level?: string } = {}
): Promise<UserUsageWindow> {
  const supabase = await getSupabaseServerClient()

  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - THIRTY_DAYS_MS)
  const windowStartIso = windowStart.toISOString()

  // Try to count free AI readiness assessments
  // Note: JSONB contains query might not work in all environments
  let freeCount = 0
  try {
    const { count, error: freeError } = await supabase
      .from('assessment_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('assessment_type', 'practice')
      .gte('created_at', windowStartIso)
      .contains('questions_data', [{ track: FREE_TRACK_CODE }])

    if (freeError) {
      // JSONB contains might not work, fall back to 0
      console.warn('[getUserUsage] JSONB contains query failed, returning 0', {
        userId,
        error: freeError.message
      })
      freeCount = 0
    } else {
      freeCount = count ?? 0
    }
  } catch (err) {
    // Catch any JSON/JSONB errors
    console.warn('[getUserUsage] Exception in free readiness query, returning 0', { userId, err })
    freeCount = 0
  }

  let practiceForLevel: number | null = null

  if (options.level) {
    const normalizedLevel = options.level.toLowerCase()

    const { count: practiceCount, error: practiceError } = await supabase
      .from('assessment_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('assessment_type', 'practice')
      .eq('certification_level', normalizedLevel)
      .gte('created_at', windowStartIso)

    if (practiceError) {
      console.error('[getUserUsage] Failed to compute practice usage for level', {
        userId,
        level: normalizedLevel,
        error: practiceError,
      })
      throw new Error('Failed to compute usage for practice assessments')
    }

    practiceForLevel = practiceCount ?? 0
  }

  return {
    windowStart: windowStartIso,
    windowEnd: windowEnd.toISOString(),
    freeAiReadinessRunsLast30d: freeCount ?? 0,
    practiceSessionsLast30dForLevel: practiceForLevel,
  }
}
