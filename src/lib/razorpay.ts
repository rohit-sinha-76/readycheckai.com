import crypto from 'crypto'

const IS_DEMO = process.env.RAZORPAY_DEMO_MODE === 'true' || !process.env.RAZORPAY_KEY_ID

export function getRazorpay() {
  if (IS_DEMO) {
    return null // No real client in demo mode
  }
  const Razorpay = require('razorpay')
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

export function createRazorpayOrder(amount: number, currency: string = 'INR') {
  if (IS_DEMO) {
    return {
      id: `order_demo_${Date.now()}`,
      amount: amount * 100, // paise
      currency,
      status: 'created',
    }
  }
  const rzp = getRazorpay()
  return rzp.orders.create({ amount: amount * 100, currency })
}

export function createOrder(params: { amountInPaise?: number; amount?: number; currency?: string; receipt?: string; notes?: Record<string, string> }) {
  const amt = params.amountInPaise ? params.amountInPaise / 100 : (params.amount || 100)
  return createRazorpayOrder(amt, params.currency || 'INR')
}

export function verifyPaymentSignature(orderIdOrParams: any, paymentIdArg?: string, signatureArg?: string): boolean {
  if (IS_DEMO) {
    return true
  }
  
  const orderId = typeof orderIdOrParams === 'string' ? orderIdOrParams : orderIdOrParams?.orderId || orderIdOrParams?.razorpay_order_id
  const paymentId = typeof orderIdOrParams === 'string' ? paymentIdArg : orderIdOrParams?.paymentId || orderIdOrParams?.razorpay_payment_id
  const signature = typeof orderIdOrParams === 'string' ? signatureArg : orderIdOrParams?.signature || orderIdOrParams?.razorpay_signature

  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))
}

export function verifyWebhookSignature(params: { body: string; signature: string } | string, sigArg?: string): boolean {
  const body = typeof params === 'string' ? params : params.body
  const signature = typeof params === 'string' ? sigArg || '' : params.signature

  if (IS_DEMO) {
    return true
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))
}
