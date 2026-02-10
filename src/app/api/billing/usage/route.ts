import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAuth } from '@/features/auth/actions'
import { getUserPlan, getUserUsage } from '@/features/dashboard/plans'

const usageQuerySchema = z.object({
  level: z.string().min(1).max(50).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateAuth(request)
    const { searchParams } = new URL(request.url)

    const parsed = usageQuerySchema.safeParse({
      level: searchParams.get('level') || undefined
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const levelParam = parsed.data.level
    const normalizedLevel = levelParam ? levelParam.toLowerCase() : undefined

    const { plan } = await getUserPlan(user.id)
    const usage = await getUserUsage(user.id, { level: normalizedLevel })

    return NextResponse.json({
      plan: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        billingInterval: plan.billingInterval,
        status: plan.status,
        maxFreeAiReadinessPer30d: plan.maxFreeAiReadinessPer30d,
        maxPracticePerLevelPer30d: plan.maxPracticePerLevelPer30d
      },
      usage: {
        ...usage,
        level: normalizedLevel || null
      }
    })
  } catch (error) {
    console.error('[BillingUsage] Error loading usage/plan info', error)
    return NextResponse.json(
      { error: 'Failed to load billing usage' },
      { status: 500 }
    )
  }
}
