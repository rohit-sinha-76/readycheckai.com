import { describe, it, expect } from 'vitest'
import { verifyWebhookSignature, verifyPaymentSignature, createOrder, createRazorpayOrder, getRazorpay } from '@/lib/razorpay'

describe('Razorpay Integration & Security - src/lib/razorpay.ts', () => {
  it('should verify webhook signature correctly in demo mode or with object payload', () => {
    const isValid = verifyWebhookSignature({
      body: JSON.stringify({ event: 'payment.captured' }),
      signature: 'test_signature'
    })
    expect(isValid).toBe(true)
  })

  it('should verify webhook signature with string body and signature argument', () => {
    const isValid = verifyWebhookSignature('{"event":"payment.authorized"}', 'test_signature_str')
    expect(isValid).toBe(true)
  })

  it('should verify payment signature with direct argument strings', () => {
    const isValid = verifyPaymentSignature('order_123', 'pay_123', 'sig_123')
    expect(isValid).toBe(true)
  })

  it('should verify payment signature with object containing orderId/paymentId/signature', () => {
    const isValid = verifyPaymentSignature({
      orderId: 'order_123',
      paymentId: 'pay_123',
      signature: 'sig_123'
    })
    expect(isValid).toBe(true)
  })

  it('should verify payment signature with object containing razorpay_order_id/razorpay_payment_id/razorpay_signature', () => {
    const isValid = verifyPaymentSignature({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'sig_123'
    })
    expect(isValid).toBe(true)
  })

  it('should create order payload with amount formatted in paise', () => {
    const order = createOrder({ amount: 500, currency: 'INR' })
    expect(order).toBeDefined()
    expect(order.amount).toBe(50000) // 500 INR = 50,000 paise
    expect(order.currency).toBe('INR')
  })

  it('should create order payload with explicit amountInPaise', () => {
    const order = createOrder({ amountInPaise: 25000, currency: 'INR' })
    expect(order).toBeDefined()
    expect(order.amount).toBe(25000)
    expect(order.currency).toBe('INR')
  })

  it('should fallback to default amount 100 when neither amount nor amountInPaise is provided', () => {
    const order = createOrder({})
    expect(order).toBeDefined()
    expect(order.amount).toBe(10000)
    expect(order.currency).toBe('INR')
  })

  it('should create direct razorpay order with default currency INR', () => {
    const order = createRazorpayOrder(50)
    expect(order.amount).toBe(5000)
    expect(order.currency).toBe('INR')
    expect(order.status).toBe('created')
  })

  it('should return null for getRazorpay in demo mode', () => {
    const client = getRazorpay()
    expect(client).toBeNull()
  })
})
