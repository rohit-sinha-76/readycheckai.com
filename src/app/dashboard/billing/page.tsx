import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BillingPortalButton, DownloadInvoicesButton, ReceiptButton } from './billing-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Calendar,
  Receipt,
  ExternalLink,
  Crown,
  Zap,
  Check,
  // ArrowUpRight,
  // AlertCircle,
  RefreshCw,
  Shield
} from 'lucide-react'

interface UserBilling {
  id: string
  email: string
  subscription_plan: 'free' | 'pro'
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | null
  current_period_start: string | null
  current_period_end: string | null
  razorpay_customer_id: string | null
  razorpay_subscription_id: string | null
  created_at: string
}

interface PaymentRecord {
  id: string
  razorpay_payment_id: string
  amount: number
  currency: string
  status: 'captured' | 'failed' | 'authorized'
  description: string | null
  created_at: string
}

async function getUserBilling(): Promise<{ billing: UserBilling; payments: PaymentRecord[] }> {
  const cookieStore = await cookies()

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

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user billing info
  const { data: billing, error: billingError } = await supabase
    .from('users')
    .select(`
      id,
      email,
      subscription_plan,
      subscription_status,
      current_period_start,
      current_period_end,
      razorpay_customer_id,
      razorpay_subscription_id,
      created_at
    `)
    .eq('id', user.id)
    .single()

  if (billingError || !billing) {
    throw new Error('Failed to fetch billing information')
  }

  // Get payment history
  const { data: payments } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    billing: billing as UserBilling,
    payments: (payments as PaymentRecord[]) || []
  }
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100) // Razorpay amounts are in paise
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'captured':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'trialing':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'past_due':
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'canceled':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

export default async function BillingPage() {
  const { billing, payments } = await getUserBilling()

  const isProSubscriber = billing.subscription_plan === 'pro'
  const subscriptionEndDate = billing.current_period_end ? new Date(billing.current_period_end) : null
  const daysUntilRenewal = subscriptionEndDate ?
    Math.ceil((subscriptionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-4">
            <CreditCard className="text-blue-600" />
            Billing & Subscription
          </h1>
          <p className="text-gray-600">
            Manage your subscription, view invoices, and update payment methods
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Plan</span>
                  <Badge className={isProSubscriber ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                    {billing.subscription_plan.toUpperCase()}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isProSubscriber
                    ? 'You have access to all premium features'
                    : 'Upgrade to unlock advanced features and unlimited assessments'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProSubscriber ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <Crown className="w-6 h-6 text-purple-600" />
                        <div>
                          <h3 className="font-semibold text-purple-900">ReadyCheck AI Pro</h3>
                          <p className="text-sm text-purple-700">Premium subscription active</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-900">₹999</p>
                        <p className="text-sm text-purple-700">per month</p>
                      </div>
                    </div>

                    {/* Subscription Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Status</span>
                        </div>
                        <Badge className={getStatusColor(billing.subscription_status || '')}>
                          {billing.subscription_status || 'Unknown'}
                        </Badge>
                      </div>

                      {subscriptionEndDate && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Next Billing</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {subscriptionEndDate.toLocaleDateString()}
                          </p>
                          {daysUntilRenewal && daysUntilRenewal > 0 && (
                            <p className="text-xs text-gray-500">
                              {daysUntilRenewal} days remaining
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pro Features */}
                    <div className="pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Your Pro Benefits</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'Unlimited assessments',
                          'All certification levels',
                          'Detailed analytics',
                          'Priority support',
                          'Custom assessment creation',
                          'Team management',
                          'Export capabilities',
                          'Advanced reporting'
                        ].map((feature) => (
                          <div key={feature} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 text-center">
                      <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-blue-900 mb-2">
                        Upgrade to Pro
                      </h3>
                      <p className="text-blue-700 mb-4">
                        Unlock unlimited assessments, advanced analytics, and priority support
                      </p>
                      <Link href="/pricing">
                        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade Now
                        </Button>
                      </Link>
                    </div>

                    {/* Free Plan Features */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Free Plan Includes</h4>
                      <div className="space-y-2">
                        {[
                          '5 assessments per month',
                          'Basic AI fundamentals',
                          'Standard support',
                          'Basic results tracking'
                        ].map((feature) => (
                          <div key={feature} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  View and download your recent payment receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Receipt className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {payment.description || 'ReadyCheck AI Pro Subscription'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(payment.created_at).toLocaleDateString()} •
                              Payment ID: {payment.razorpay_payment_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <Badge className={getStatusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                          </div>
                          <ReceiptButton payment={payment} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                    <p className="text-gray-600">
                      {isProSubscriber
                        ? 'Payment records will appear here once available'
                        : 'Upgrade to Pro to start building your payment history'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isProSubscriber && (
                  <Link href="/pricing" className="block">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                )}

                <BillingPortalButton userHasRazorpayCustomer={!!billing.razorpay_customer_id} />

                <DownloadInvoicesButton />
              </CardContent>
            </Card>

            {/* Billing Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <p className="text-gray-600 mb-1">Email</p>
                  <p className="font-medium text-gray-900">{billing.email}</p>
                </div>

                {billing.razorpay_customer_id && (
                  <div className="text-sm">
                    <p className="text-gray-600 mb-1">Customer ID</p>
                    <p className="font-mono text-xs text-gray-700 bg-gray-100 p-2 rounded">
                      {billing.razorpay_customer_id}
                    </p>
                  </div>
                )}

                <div className="text-sm">
                  <p className="text-gray-600 mb-1">Member Since</p>
                  <p className="font-medium text-gray-900">
                    {new Date(billing.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Secure Payments</h4>
                    <p className="text-sm text-blue-700">
                      All payments are processed securely through Razorpay with
                      industry-standard encryption and security measures.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Have questions about billing or need assistance with your subscription?
                </p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
