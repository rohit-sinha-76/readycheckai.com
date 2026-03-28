# Code Standards

## Directory Structure
```
src/
├── app/              # Thin routing layer (<30 lines per page)
│   ├── (auth)/       # Route groups
│   ├── assess/
│   ├── results/
│   ├── certificate/
│   ├── dashboard/
│   ├── roadmap/
│   ├── leaderboard/  # Static
│   ├── pricing/      # Static
│   ├── legal/        # Static
│   ├── admin/
│   ├── api/          # Webhooks + Inngest ONLY. NO mutation routes (use Server Actions)
│   └── page.tsx      # Landing
├── features/         # ONE folder per feature
│   ├── auth/
│   ├── assessment/
│   ├── roadmap/
│   ├── certificate/
│   ├── dashboard/
│   └── admin/
├── contracts/        # Zod schemas
├── components/ui/    # Radix wrappers
├── lib/              # Cross-cutting ONLY
│   ├── supabase/
│   ├── gemini.ts
│   ├── razorpay.ts
│   ├── rate-limiter.ts
│   ├── inngest.ts
│   ├── realtime.ts
│   ├── errors.ts
│   ├── logger.ts
│   ├── utils.ts
│   └── constants.ts
└── __tests__/
```

## Naming
- Components: PascalCase (`AssessmentEngine.tsx`)
- Hooks: camelCase (`useAssessment.ts`)
- Files: kebab-case (`rate-limiter.ts`)
- Server Actions: camelCase (`startAssessment()`)
- Features: kebab-case folder

## Patterns
- **Mutations:** Server Actions (`'use server'`) with Zod validation
- **Queries:** React Server Components with direct Supabase queries
- **Errors:** `AppError` class with `code`, `statusCode`, `isOperational`
- **Error Tracking:** Unexpected errors captured via `Sentry.captureException()` in `AppError` constructor
- **Rate Limiting:** `checkRateLimit(identifier, max, windowSeconds)` before expensive ops
- **Auth:** `supabase.auth.getUser()` on every Server Action + server-side role checks
- **Async Jobs:** `inngest.send()` for LLM calls, Realtime subscription for completion

## Forbidden
- ❌ No `Map` for rate limiting (use Upstash Redis)
- ❌ No Socket.io in serverless (deleted)
- ❌ No raw SQL without parameterization
- ❌ No client-side role checks (always server-side)
- ❌ No `any` types (strict TypeScript)
- ❌ No business logic in `app/` pages (keep in `features/`)
- ❌ No polling for async completion (use Supabase Realtime)
- ❌ No mutation API routes (use Server Actions)

## Import Aliases
| Alias | Maps To |
|-------|---------|
| `@/*` | `src/*` |
| `@/features/*` | `src/features/*` |
| `@/contracts/*` | `src/contracts/*` |
| `@/components/*` | `src/components/*` |
| `@/lib/*` | `src/lib/*` |

## Testing
- Vitest 4 with jsdom environment
- Coverage thresholds: 70% lines/functions, 60% branches
- Test Server Actions directly, not API routes
