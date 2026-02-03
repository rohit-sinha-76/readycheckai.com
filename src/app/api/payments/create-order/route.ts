import { NextResponse, type NextRequest } from 'next/server'
import { createOrder } from '@/lib/razorpay'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { receipt, notes, plan = 'pro' } = body

    // Authoritative Server-side Price Mapping (Prevent price tampering)
    const PLAN_PRICES: Record<string, number> = {
      pro: 29900, // ₹299.00 in paise
    }

    const authoritativeAmount = PLAN_PRICES[plan] ?? 29900

    // If client supplied custom amount, verify it is not tampered below plan price
    if (body.amountInPaise && typeof body.amountInPaise === 'number' && body.amountInPaise < authoritativeAmount) {
      return NextResponse.json({ error: 'Invalid or tampered amount' }, { status: 400 })
    }

    const amountInPaise = authoritativeAmount

    // Link order to authenticated user
    const orderNotes = { 
      ...notes, 
      plan,
      userId: user.id, 
      userEmail: user.email 
    }

    const order = await createOrder({ 
      amountInPaise, 
      receipt: receipt || `receipt_${user.id}_${Date.now()}`, 
      notes: orderNotes 
    })

    // Log payment creation in audit log
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'ORDER_CREATED',
      order_id: order.id,
      amount: amountInPaise,
      currency: 'INR',
      status: 'created',
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      metadata: { notes: orderNotes }
    })

    return NextResponse.json({ order })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create order'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
