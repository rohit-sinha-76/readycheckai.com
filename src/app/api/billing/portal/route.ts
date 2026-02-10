import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'


const RAZORPAY_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://dashboard.razorpay.com'
  : 'https://dashboard.razorpay.com'

export async function GET() {
  try {
    const cookieStore = await cookies()

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

    // Get user's Razorpay customer ID
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('razorpay_customer_id, email')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      console.error('Error fetching user record:', userError)
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      )
    }

    if (!userRecord.razorpay_customer_id) {
      return NextResponse.json(
        { error: 'No Razorpay customer ID found. Please make a purchase first.' },
        { status: 400 }
      )
    }

    // Generate customer portal URL
    // Note: Razorpay doesn't have a direct customer portal API like Stripe
    // We'll redirect to the payment history section or create a custom portal
    const portalUrl = `${RAZORPAY_BASE_URL}/payments?customer_id=${userRecord.razorpay_customer_id}`

    // Check if we should redirect or return JSON based on config
    const billingPortalTarget = process.env.BILLING_PORTAL_TARGET || 'json'

    if (billingPortalTarget === 'redirect') {
      return NextResponse.redirect(portalUrl)
    }

    return NextResponse.json({
      url: portalUrl,
      customer_id: userRecord.razorpay_customer_id
    })

  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
