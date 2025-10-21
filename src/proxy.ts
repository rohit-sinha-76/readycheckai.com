import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RateLimiter, RATE_LIMIT_CONFIGS, getClientIP } from '@/lib/security'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/assess',
    '/assessment',
    '/results',
    '/subscription',
    '/admin',
    '/profile',
    '/roadmap',
    '/api/assessment',
    '/api/assessments',
    '/api/admin',
    '/api/payments',
  ]

  const adminRoutes = ['/admin', '/api/admin']

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  // If path is not a protected route, return next immediately without hitting Supabase auth
  if (!isProtectedRoute && !pathname.startsWith('/auth/') && pathname !== '/login' && pathname !== '/signup') {
    return NextResponse.next()
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Redirect to login if accessing protected route without user
  if (isProtectedRoute && (!user || authError)) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin route role verification (Security: Never trust user_metadata, only app_metadata or DB)
  if (isAdminRoute && user) {
    const appRole = user.app_metadata?.role as string | undefined

    if (appRole) {
      if (!['admin', 'superadmin'].includes(appRole)) {
        return NextResponse.redirect(new URL('/dashboard?error=Unauthorized', req.url))
      }
    } else {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
        return NextResponse.redirect(new URL('/dashboard?error=Unauthorized', req.url))
      }
    }
  }

  // Rate limiting for authenticated API routes
  if (pathname.startsWith('/api/') && user) {
    const clientIP = getClientIP(req)
    const limiter = new RateLimiter()
    const config = RATE_LIMIT_CONFIGS[pathname] ?? RATE_LIMIT_CONFIGS['default']
    const { allowed, remaining, resetTime } = await limiter.checkRateLimit(
      clientIP,
      'ip',
      pathname,
      config
    )
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.getTime().toString(),
            'Retry-After': Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString(),
          },
        }
      )
    }
  }

  // Set user ID in header for downstream route handlers
  if (user) {
    res.headers.set('x-user-id', user.id)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname.startsWith('/auth/') || pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export default async function adapterFn(opts: any) {
  if (opts && typeof opts === 'object' && 'handler' in opts && 'request' in opts) {
    const { adapter } = await import('next/dist/server/web/adapter')
    return adapter(opts)
  }
  return proxy(opts)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/assess/:path*',
    '/results/:path*',
    '/roadmap/:path*',
    '/profile/:path*',
    '/api/admin/:path*',
    '/api/payments/webhook',
  ],
}
