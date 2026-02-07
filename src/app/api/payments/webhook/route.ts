import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')
  const eventId = req.headers.get('x-razorpay-event-id') || `event_${Date.now()}`

  if (!signature) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
  }

  if (!verifyWebhookSignature({ body, signature })) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = await createClient()

  // Idempotency check
  const { data: existing } = await supabase
    .from('processed_webhooks')
    .select('event_id')
    .eq('event_id', eventId)
    .single()

  if (existing) {
    return NextResponse.json({ status: 'already_processed' })
  }

  let payload: any = {}
  try {
    payload = JSON.parse(body)
  } catch {
    payload = { event: 'demo.payment' }
  }

  // Process payment
  await processPaymentEvent(payload)

  // Record processing
  await supabase.from('processed_webhooks').insert({
    event_id: eventId,
    event_type: payload.event || 'payment.captured',
    payload_hash: await sha256(body),
  })

  return NextResponse.json({ status: 'ok' })
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function processPaymentEvent(payload: any) {
  try {
    const event = payload?.event
    const paymentEntity = payload?.payload?.payment?.entity
    const userId = paymentEntity?.notes?.userId
    const amount = paymentEntity?.amount

    if ((event === 'payment.captured' || event === 'order.paid') && userId) {
      const supabase = await createClient()
      const now = new Date()
      const proEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      await supabase
        .from('users')
        .update({
          subscription_plan: 'pro',
          pro_subscription_start: now.toISOString(),
          pro_subscription_end: proEnd.toISOString(),
        })
        .eq('id', userId)

      await supabase.from('payment_audit_log').insert({
        user_id: userId,
        action: 'WEBHOOK_PRO_ACTIVATED',
        order_id: paymentEntity?.order_id,
        payment_id: paymentEntity?.id,
        amount: amount,
        status: 'verified',
        metadata: { event, paymentEntity }
      })
    }
  } catch (err) {
    console.error('[Webhook Payment Processing Error]', err)
  }
}
