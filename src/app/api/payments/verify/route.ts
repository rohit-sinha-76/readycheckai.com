import { NextResponse, type NextRequest } from 'next/server'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json()
    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })
    }

    // orderId from client should equal razorpay_order_id
    if (orderId !== razorpay_order_id) {
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
    }

    const valid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    // Persist payment with idempotency and user linkage
    const record = {
      user_id: user.id,
      razorpay_order_id: razorpay_order_id as string,
      razorpay_payment_id: razorpay_payment_id as string,
      status: 'verified',
      notes: { source: 'verify-endpoint', userEmail: user.email },
    }

    const { error } = await supabase
      .from('payments')
      .upsert(record, { onConflict: 'razorpay_payment_id' })
    
    if (error) {
      const msg = String(error.message || '')
      if (!msg.includes('duplicate')) {
        return NextResponse.json({ success: true, warning: 'persist_failed', detail: msg })
      }
    }

    // Activate Pro subscription for the user (30 days entitlement)
    const now = new Date()
    const proEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await supabase
      .from('users')
      .update({
        subscription_plan: 'pro',
        pro_subscription_start: now.toISOString(),
        pro_subscription_end: proEnd.toISOString(),
      })
      .eq('id', user.id)

    // Log payment verification
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'PAYMENT_VERIFIED',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      status: 'verified',
      ip_address: (req as any).ip || req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent')
    })

    return NextResponse.json({ success: true, orderId, paymentId: razorpay_payment_id, plan: 'pro' })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Verification failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
