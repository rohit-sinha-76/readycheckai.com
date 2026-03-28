# Architecture

## System Diagram
```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Client    │────▶│  Next.js 16 (Vercel)│────▶│  Upstash Redis  │
│  (Browser)  │◄────│  - App Router        │     │  (Rate Limit)   │
└─────────────┘     │  - React 19 RSC      │     └─────────────────┘
       │            │  - Turbopack         │              │
       │            │  - Server Actions    │              │
       │            └─────────────────────┘              │
       │                      │                          │
       │            ┌─────────┴──────────┐               │
       │            ▼                    ▼               │
       │     ┌──────────┐        ┌─────────────┐       │
       └────▶│ Inngest  │        │  Supabase   │◄──────┘
              │  Queue   │        │  - Postgres │
              └────┬─────┘        │  - Auth     │
                   │              │  - Realtime │
                   ▼              └─────────────┘
            ┌──────────┐
            │  Gemini  │◄──── Fallback: gemini-3.1-flash-lite
            │ 3.5 Flash│
            └──────────┘
                   │
                   ▼
            ┌──────────┐
            │  Sentry  │          Error Tracking & Session Replay
            │ (Errors) │
            └──────────┘
```

## Data Flows

### Assessment Flow
1. User clicks Start → `src/features/assessment/actions.ts:startAssessment()`
2. `checkRateLimit(user.id, 5, 60)` → Upstash Redis
3. `generateQuestions(track, level, 18)` → Gemini 3.5 Flash
4. Session stored in `assessment_sessions` table
5. Client receives `sessionId` + questions

### Submission Flow
1. User submits answers → `src/features/assessment/actions.ts:submitAssessment()`
2. `checkRateLimit(submit:user.id, 10, 60)` → Upstash Redis
3. `calculateScore()` server-side
4. Result stored in `assessment_progress`
5. If passed → `inngest.send('app/certificate.generate')`
6. `revalidatePath('/dashboard')`

### Roadmap Flow
1. User requests roadmap → `src/features/roadmap/actions.ts:requestRoadmapGeneration()`
2. `checkRateLimit(roadmap:user.id, 3, 3600)` → Upstash Redis
3. Pending record created in `roadmaps` table
4. `inngest.send('app/roadmap.generate')` → Inngest queue
5. Worker calls `generateRoadmap()` → Gemini 3.5 Flash
6. Result saved to DB, status updated to 'completed'
7. Supabase Realtime pushes update to client (no polling)

## API Contract Summary
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `startAssessment()` | Server Action | Begin assessment |
| `submitAssessment()` | Server Action | Submit answers |
| `finalizeAssessment()` | Server Action | Complete assessment |
| `requestRoadmapGeneration()` | Server Action | Queue roadmap |
| `/api/inngest` | POST/GET | Inngest job handler |
| `/api/payments/webhook` | POST | Razorpay webhook (demo mode) |
| `/api/health` | GET | Health check |

## Database Schema
| Table | Purpose |
|-------|---------|
| `users` | Auth + roles |
| `assessment_sessions` | Active test sessions |
| `assessment_progress` | Completed results |
| `questions` | Question bank |
| `question_analytics` | Usage stats |
| `question_access_log` | Audit trail |
| `certificates` | Generated certificates |
| `honor_code_violations` | Proctoring events |
| `roadmaps` | AI-generated learning paths |
| `roadmap_progress` | User progress on roadmap |
| `roadmap_generation_limits` | Rate tracking |
| `rate_limits` | Legacy table (superseded by Upstash Redis) |
| `webhook_events` | Payment webhook log |
| `processed_webhooks` | Idempotency dedup |
| `admin_audit_log` | Admin action trail |

## Auth Flow
1. User logs in via Supabase Auth (`/auth/login`)
2. JWT stored in cookie (SSR-safe via `@supabase/ssr`)
3. `middleware.ts` checks auth for protected routes
4. Server Actions re-verify `supabase.auth.getUser()` on every call
5. Admin routes: `adminGuard()` checks DB role + silent 404 for unauthorized

## Infrastructure Map
| Service | Free Tier | Why |
|---------|-----------|-----|
| Vercel Hobby | 100GB/mo | Next.js 16 hosting |
| Supabase Free | 500MB DB | Postgres + Auth + Realtime |
| Upstash Redis | 10k cmds/day | Rate limiting |
| Inngest | 50k events/mo | Async jobs |
| Sentry | 5k errors/mo | Error tracking + distributed tracing |
