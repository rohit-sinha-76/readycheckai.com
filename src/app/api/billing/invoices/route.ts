import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema
const invoicesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  format: z.enum(['json', 'zip']).optional().default('json')
})

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const validatedQuery = invoicesQuerySchema.parse({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      limit: searchParams.get('limit'),
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

    // Build query for payment records
    let query = supabase
      .from('payment_records')
      .select(`
        id,
        razorpay_payment_id,
        amount,
        currency,
        status,
        description,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('status', 'captured') // Only successful payments
      .order('created_at', { ascending: false })
      .limit(validatedQuery.limit)

    // Apply date filters if provided
    if (validatedQuery.from) {
      query = query.gte('created_at', validatedQuery.from)
    }
    if (validatedQuery.to) {
      query = query.lte('created_at', validatedQuery.to)
    }

    const { data: paymentRecords, error: paymentError } = await query

    if (paymentError) {
      console.error('Error fetching payment records:', paymentError)
      return NextResponse.json(
        { error: 'Error fetching payment records' },
        { status: 500 }
      )
    }

    if (!paymentRecords || paymentRecords.length === 0) {
      return NextResponse.json({
        invoices: [],
        count: 0,
        message: 'No invoices found for the specified criteria'
      })
    }

    // Get user details
    const { data: userRecord } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    // Format currency helper
    const formatCurrency = (amount: number, currency: string = 'INR'): string => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
      }).format(amount / 100)
    }

    if (validatedQuery.format === 'json') {
      // Return JSON list of invoices
      const invoices = paymentRecords.map(record => ({
        id: record.id,
        payment_id: record.razorpay_payment_id,
        amount: record.amount,
        currency: record.currency,
        formatted_amount: formatCurrency(record.amount, record.currency),
        description: record.description || 'ReadyCheck AI Pro Subscription',
        date: record.created_at,
        formatted_date: new Date(record.created_at).toLocaleDateString('en-IN'),
        status: record.status,
        receipt_url: `/api/billing/receipt/${record.razorpay_payment_id}?format=html`
      }))

      return NextResponse.json({
        invoices,
        count: invoices.length,
        customer: {
          email: userRecord?.email,
          name: userRecord?.full_name
        },
        date_range: {
          from: validatedQuery.from,
          to: validatedQuery.to
        }
      })
    }

    if (validatedQuery.format === 'zip') {
      // For ZIP format, we would typically use a library like archiver or jszip
      // For now, return a simple implementation note
      return NextResponse.json({
        error: 'ZIP format not yet implemented',
        message: 'Please use format=json to get invoice list, then download individual receipts',
        available_receipts: paymentRecords.map(record => ({
          payment_id: record.razorpay_payment_id,
          receipt_url: `/api/billing/receipt/${record.razorpay_payment_id}?format=html`
        }))
      }, { status: 501 })
    }

    return NextResponse.json(
      { error: 'Invalid format specified' },
      { status: 400 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Invoices API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
