import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema
const receiptParamsSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required')
})

const receiptQuerySchema = z.object({
  format: z.enum(['html', 'pdf']).optional().default('html')
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ payment_id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const params = await context.params
    
    // Validate params
    const validatedParams = receiptParamsSchema.parse(params)
    const { searchParams } = new URL(request.url)
    const validatedQuery = receiptQuerySchema.parse({
      format: searchParams.get('format')
    })

    // Initialize Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    // Get payment record and verify ownership
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_records')
      .select(`
        id,
        razorpay_payment_id,
        amount,
        currency,
        status,
        description,
        created_at,
        user_id
      `)
      .eq('user_id', user.id)
      .eq('razorpay_payment_id', validatedParams.payment_id)
      .single()

    if (paymentError || !paymentRecord) {
      return NextResponse.json(
        { error: 'Payment record not found or access denied' },
        { status: 404 }
      )
    }

    // Get user details for receipt
    const { data: userRecord } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    // Format amount
    const formatCurrency = (amount: number, currency: string = 'INR'): string => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
      }).format(amount / 100) // Razorpay amounts are in paise
    }

    // Generate receipt HTML
    const receiptHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt - ${paymentRecord.razorpay_payment_id}</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
            .receipt-title { font-size: 20px; margin: 10px 0; }
            .payment-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; }
            .amount { font-size: 18px; font-weight: bold; color: #059669; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
            .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-success { background: #dcfce7; color: #166534; }
            .status-failed { background: #fee2e2; color: #991b1b; }
            @media print { body { margin: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">ReadyCheck AI</div>
            <div class="receipt-title">Payment Receipt</div>
        </div>
        
        <div class="payment-details">
            <div class="detail-row">
                <span class="label">Receipt #:</span>
                <span>${paymentRecord.razorpay_payment_id}</span>
            </div>
            <div class="detail-row">
                <span class="label">Date:</span>
                <span>${new Date(paymentRecord.created_at).toLocaleDateString('en-IN')}</span>
            </div>
            <div class="detail-row">
                <span class="label">Customer:</span>
                <span>${userRecord?.full_name || userRecord?.email || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Email:</span>
                <span>${userRecord?.email}</span>
            </div>
            <div class="detail-row">
                <span class="label">Description:</span>
                <span>${paymentRecord.description || 'ReadyCheck AI Pro Subscription'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Status:</span>
                <span class="status ${paymentRecord.status === 'captured' ? 'status-success' : 'status-failed'}">
                    ${paymentRecord.status.toUpperCase()}
                </span>
            </div>
            <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="amount">${formatCurrency(paymentRecord.amount, paymentRecord.currency)}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>For questions about this receipt, contact support@readycheckai.com</p>
            <p>ReadyCheck AI - AI Skills Assessment Platform</p>
        </div>
    </body>
    </html>
    `

    if (validatedQuery.format === 'pdf') {
      // For PDF generation, you would typically use a library like puppeteer or @react-pdf/renderer
      // For now, return HTML with print-friendly styling
      return new NextResponse(receiptHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="receipt-${paymentRecord.razorpay_payment_id}.html"`
        }
      })
    }

    return new NextResponse(receiptHtml, {
      headers: {
        'Content-Type': 'text/html'
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Receipt generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
