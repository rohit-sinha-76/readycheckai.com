import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ArrowRight, Star, Users, Zap, ChevronDown, Crown, Calendar, CreditCard, Shield, Check, AlertCircle } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type PlanRow = {
  slug: string
  name: string
  plan_group: string
  description: string | null
  price_in_paise: number | null
  currency: string
  billing_interval: 'monthly' | 'yearly' | 'none'
  status: 'active' | 'coming_soon' | 'deprecated'
}

type PricingCard = {
  key: string
  name: string
  planSlug: string
  price: string
  period: string
  annualPrice?: string
  annualSavings?: string
  description: string
  features: string[]
  cta: string
  href: string
  popular?: boolean
  icon: typeof Zap
  disabled?: boolean
}

interface CurrentUser {
  id: string
  email: string
  subscription_plan: 'free' | 'pro'
  razorpay_customer_id: string | null
  plan_granted_by_admin: boolean | null
  pro_subscription_end: string | null
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: userData } = await supabase
      .from('users')
      .select('id, email, subscription_plan, razorpay_customer_id, plan_granted_by_admin, pro_subscription_end')
      .eq('id', user.id)
      .single()

    return userData as CurrentUser || null
  } catch {
    return null
  }
}

function formatCurrency(amountInPaise: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amountInPaise / 100)
}

function buildPricingCards(rows: PlanRow[]): PricingCard[] {
  const freePlan = rows.find(r => r.plan_group === 'free' || r.slug === 'free')
  const proMonthly = rows.find(
    r => r.plan_group === 'pro_individual_inr' && r.billing_interval === 'monthly'
  )
  const proYearly = rows.find(
    r => r.plan_group === 'pro_individual_inr' && r.billing_interval === 'yearly'
  )
  const teamPlan = rows.find(r => r.plan_group === 'team_org_inr' || r.slug === 'team_org_inr')

  const cards: PricingCard[] = []

  if (freePlan) {
    cards.push({
      key: freePlan.slug,
      name: 'Discovery',
      planSlug: freePlan.slug,
      price: freePlan.price_in_paise != null
        ? formatCurrency(freePlan.price_in_paise, freePlan.currency)
        : '₹0',
      period: 'forever',
      description:
        freePlan.description || 'Perfect for individuals exploring AI readiness',
      features: [
        'AI readiness assessment',
        'Basic AI readiness score',
        'Email report with results',
        'General learning recommendations'
      ],
      cta: 'Start Free',
      href: '/dashboard',
      popular: false,
      icon: Zap
    })
  }

  if (proMonthly) {
    const monthlyPrice = proMonthly.price_in_paise
    const yearlyPrice = proYearly?.price_in_paise ?? null

    const annualPrice = yearlyPrice != null
      ? formatCurrency(yearlyPrice, proYearly!.currency)
      : undefined

    const savingsPaise =
      monthlyPrice != null && yearlyPrice != null
        ? monthlyPrice * 12 - yearlyPrice
        : null

    const annualSavings =
      savingsPaise != null && savingsPaise > 0
        ? formatCurrency(savingsPaise, proMonthly.currency)
        : undefined

    cards.push({
      key: proMonthly.slug,
      name: 'Professional',
      planSlug: proMonthly.slug,
      price:
        monthlyPrice != null
          ? formatCurrency(monthlyPrice, proMonthly.currency)
          : '—',
      period: 'per month',
      annualPrice,
      annualSavings,
      description:
        proMonthly.description ||
        'For professionals serious about AI skill development',
      features: [
        'Full access to assessment library',
        'Advanced analytics & insights',
        'Personalized learning roadmap',
        'Progress tracking over time',
        'Industry benchmarking',
        'Priority email support'
      ],
      cta: 'Start Free Trial',
      href: '/assess/start', // Start with demo assessment
      popular: true,
      icon: Users
    })
  }

  if (teamPlan) {
    const priceDisplay =
      teamPlan.price_in_paise != null
        ? formatCurrency(teamPlan.price_in_paise, teamPlan.currency)
        : 'Custom pricing'

    const isComingSoon = teamPlan.status === 'coming_soon'

    cards.push({
      key: teamPlan.slug,
      name: 'Team',
      planSlug: teamPlan.slug,
      price: priceDisplay,
      period: teamPlan.billing_interval === 'none' ? 'per month' : `per ${teamPlan.billing_interval}`,
      description:
        teamPlan.description ||
        'For teams and organizations building AI capabilities',
      features: [
        'Team dashboard & analytics',
        'Manager insights & reports',
        'Skills gap analysis',
        'Custom learning paths',
        'Dedicated account manager',
        'Priority support'
      ],
      cta: isComingSoon ? 'Coming Soon' : 'Talk to Sales',
      href: isComingSoon
        ? '#'
        : `/auth/signup?plan=${encodeURIComponent(teamPlan.slug)}`,
      popular: false,
      icon: Star,
      disabled: isComingSoon
    })
  }

  return cards
}

export default async function PricingPage() {
  const supabase = await getSupabaseServerClient()

  const [currentUser, { data: planRows, error }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from('plans')
      .select('slug, name, plan_group, description, price_in_paise, currency, billing_interval, status')
      .in('status', ['active', 'coming_soon'])
      .order('plan_group', { ascending: true })
  ])

  if (error) {
    console.error('[PricingPage] Failed to load plans from database', error)
  }

  const plans = buildPricingCards(planRows || [])
  const isProUser = currentUser?.subscription_plan === 'pro'

  const faqs = [
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, UPI (GPay, PhonePe, Paytm), Net Banking, and digital wallets. All payments are processed securely through Razorpay.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! Professional and Team plans come with a 14-day free trial. No credit card required to start. The Discovery plan is free forever.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Absolutely. You can cancel your subscription at any time. Your access will continue until the end of your current billing period.'
    },
    {
      question: 'Do you offer annual discounts?',
      answer: 'Yes! Annual plans save you approximately 17% compared to monthly billing. The savings are automatically applied at checkout.'
    },
    {
      question: 'What about GST?',
      answer: 'All prices are inclusive of 18% GST. You\'ll receive proper GST invoices for all payments, suitable for business expense claims.'
    },
    {
      question: 'Can I upgrade or downgrade my plan?',
      answer: 'Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the next billing cycle.'
    }
  ]

  // If user is Pro, show their billing management instead
  if (isProUser && currentUser) {
    const subscriptionEndDate = currentUser.pro_subscription_end ? new Date(currentUser.pro_subscription_end) : null
    const daysUntilRenewal = subscriptionEndDate ?
      Math.ceil((subscriptionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
    const isAdminGranted = currentUser.plan_granted_by_admin === true

    return (
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-100 text-purple-800 border-purple-200">
              <Crown className="h-3 w-3 mr-1 inline" />
              PRO SUBSCRIBER
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
              Your Subscription
            </h2>
            <p className="text-lg leading-8 text-muted-foreground">
              Manage your ReadyCheck AI Pro subscription and billing details
            </p>
          </div>

          {/* Current Plan Card */}
          <Card className="mb-8 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Crown className="h-6 w-6 text-purple-600" />
                  ReadyCheck AI Pro
                </span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </CardTitle>
              <CardDescription>
                Full access to all premium features and certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Payment Method */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground/80">Payment Method</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {isAdminGranted ? (
                      <span className="flex items-center gap-1 text-green-700">
                        <Shield className="h-4 w-4" />
                        Approved by Admin
                      </span>
                    ) : currentUser.razorpay_customer_id ? (
                      'Razorpay'
                    ) : (
                      'Not set up'
                    )}
                  </p>
                  {isAdminGranted && (
                    <p className="text-xs text-green-600 mt-1">
                      Complimentary access granted
                    </p>
                  )}
                </div>

                {/* Renewal Date */}
                {subscriptionEndDate && !isAdminGranted && (
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground/80">Subscription Ends</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {subscriptionEndDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    {daysUntilRenewal && daysUntilRenewal > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {daysUntilRenewal} days remaining
                      </p>
                    )}
                  </div>
                )}

                {isAdminGranted && (
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground/80">Plan Type</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Lifetime Access
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No expiration
                    </p>
                  </div>
                )}

                {/* Status */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground/80">Account Status</span>
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    All Systems Active
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full access enabled
                  </p>
                </div>
              </div>

              {/* Pro Features List */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-foreground mb-4">Your Pro Benefits</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    'Unlimited assessments',
                    'All certification levels',
                    'Detailed analytics & insights',
                    'Priority email support',
                    'Personalized learning paths',
                    'Industry benchmarking',
                    'Progress tracking',
                    'Advanced reporting'
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t flex flex-wrap gap-3">
                <Link href="/dashboard/billing">
                  <Button variant="default">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Have questions about your subscription? Our support team is here to help.
                </p>
                <Link href="/dashboard/billing">
                  <Button variant="outline" className="border-blue-300 hover:bg-blue-100">
                    Visit Billing Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Regular pricing page for non-Pro users
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Choose the right plan for your AI journey
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Start free, scale as you grow. All plans include our core assessment technology.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? 'ring-2 ring-primary-600 scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-primary-600 px-4 py-1 text-sm font-medium text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-100 p-2">
                    <plan.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline gap-x-2">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>

                  {plan.annualPrice && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        or {plan.annualPrice}/year
                      </span>
                      {plan.annualSavings && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-success-100 dark:bg-success-900/30 px-2 py-1 text-xs font-medium text-success-700 dark:text-success-400">
                          Save {plan.annualSavings}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <CardDescription className="mt-4 text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckCircle className="h-6 w-6 flex-none text-primary-600" />
                      <span className="text-sm leading-6 text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={plan.disabled}
                >
                  <Link
                    href={plan.disabled ? '#' : plan.href}
                    aria-disabled={plan.disabled}
                    className="flex items-center gap-2"
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Secure payments powered by Razorpay
          </h3>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Credit/Debit Cards</span>
            <span>•</span>
            <span>UPI</span>
            <span>•</span>
            <span>Net Banking</span>
            <span>•</span>
            <span>Wallets</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            All prices inclusive of 18% GST • Cancel anytime
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h3 className="text-2xl font-bold tracking-tight text-foreground text-center mb-6">
            Frequently Asked Questions
          </h3>
          <div className="grid gap-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-border overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer p-4 hover:bg-accent/50 transition-colors list-none">
                    <span className="text-base font-semibold text-foreground">
                      {faq.question}
                    </span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mx-auto mt-24 max-w-2xl text-center">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            Ready to get started?
          </h3>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of professionals and teams building AI-ready capabilities.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/dashboard">Start Free Assessment</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
