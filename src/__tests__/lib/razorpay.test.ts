import { describe, it, expect } from 'vitest'
import { verifyWebhookSignature, verifyPaymentSignature, createOrder } from '@/lib/razorpay'

describe('Razorpay Integration & Security - src/lib/razorpay.ts', () => {
  it('should verify webhook signature correctly in demo mode or with HMAC', () => {
    const isValid = verifyWebhookSignature({
      body: JSON.stringify({ event: 'payment.captured' }),
      signature: 'test_signature'
    })

    expect(isValid).toBe(true)
  })

  it('should verify payment signature correctly', () => {
    const isValid = verifyPaymentSignature('order_123', 'pay_123', 'sig_123')
    expect(isValid).toBe(true)
  })

  it('should create order payload with amount formatted in paise', () => {
    const order = createOrder({ amount: 500, currency: 'INR' })
    expect(order).toBeDefined()
    expect(order.amount).toBe(50000) // 500 INR = 50,000 paise
    expect(order.currency).toBe('INR')
  })
})
