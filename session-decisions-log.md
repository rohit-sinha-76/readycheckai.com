# Session Decisions Log — ReadyCheck AI

## 2026-05-15 — Tech Stack & Framework Architecture
- **Decision:** Select Next.js 14 App Router, TypeScript 5.9, Supabase PostgreSQL, and Tailwind CSS.
- **Context:** Requires an integrated full-stack framework with Server Actions and native PostgreSQL RLS for multi-tenant data security.
- **Alternatives Considered:** Express.js REST API + React SPA (rejected due to double deployment overhead and duplicate TypeScript types).
- **Impact:** Created `src/app/`, `database/01_combined_core_systems.sql`, `package.json`.
- **Status:** Active

## 2026-06-01 — PostgreSQL RPC Rate Limiting vs Dedicated Redis
- **Decision:** Implement PostgreSQL RPC rate limiting procedure `check_rate_limit` alongside in-memory `RateLimiterStore`.
- **Context:** Avoids introducing paid external infrastructure dependencies during initial product launch.
- **Alternatives Considered:** Self-hosted Redis cluster (rejected due to DevOps management cost and budget limits).
- **Impact:** Created `src/lib/rate-limiter.ts`, `src/lib/security.ts`.
- **Status:** Active

## 2026-06-10 — Custom Gemini Response JSON Repair Sanitizer
- **Decision:** Build `cleanJson` state-machine sanitizer and `parseGeminiResponse` in `src/lib/gemini.ts`.
- **Context:** Google Gemini LLM API outputs occasional markdown wrappers and raw control characters that crash standard `JSON.parse()`.
- **Alternatives Considered:** Retry prompts to LLM on syntax errors (rejected due to API latency and cost overhead).
- **Impact:** Created `src/lib/gemini.ts`, `src/lib/actions/roadmap.ts`.
- **Status:** Active

## 2026-07-01 — Razorpay Payment Signature Verification & Mock Fallback
- **Decision:** Enforce timing-safe HMAC-SHA256 signature verification via `crypto.timingSafeEqual` with automatic Demo Mode fallback (`order_demo_`).
- **Context:** Protect payment verification against timing attacks while enabling frictionless local staging development without API keys.
- **Alternatives Considered:** Standard string equality `===` (rejected due to security vulnerability).
- **Impact:** Modified `src/lib/razorpay.ts`, `src/app/api/payments/route.ts`.
- **Status:** Active

## 2026-07-28 — WebSockets Runtime Deactivation
- **Decision:** Mark Socket.IO WebSocket server (`src/lib/websocket-server.ts`) as unwired boilerplate code and shift real-time state to Next.js Server Components.
- **Context:** Standard Next.js serverless runtimes (`next start`) do not support persistent Socket.IO server instances without custom HTTP wrappers.
- **Alternatives Considered:** Supabase Realtime WebSocket subscriptions (rejected for current release to simplify infrastructure).
- **Impact:** Updated `project-overview.md`, `architecture.md`, `code-standards.md`.
- **Status:** Active

## 2026-07-29 — Admin Panel Route Consolidation
- **Decision:** Consolidate legacy `/internal-admin-panel` route into canonical `/admin` path protected by middleware RBAC.
- **Context:** Eliminate duplicate admin page views (`/admin` vs `/internal-admin-panel`) and reduce code maintenance debt.
- **Alternatives Considered:** Maintaining parallel admin routes (rejected due to code duplication).
- **Impact:** `src/middleware.ts`, `src/app/admin/page.tsx`, `progress-tracker.md`.
- **Status:** Active

## 2026-07-29 — Upstash Redis Infrastructure Migration Plan
- **Decision:** Plan migration of in-memory `RateLimiterStore` to Upstash Redis (`@upstash/ratelimit`) over self-hosted Redis or Inngest/BullMQ.
- **Context:** Upstash provides HTTP REST edge compatibility ideal for Vercel edge middleware rate limiting without persistent socket connections.
- **Alternatives Considered:** Inngest, BullMQ, or self-hosted Redis (rejected due to connection pooling constraints in serverless).
- **Impact:** Logged in `progress-tracker.md` KNOWN DEBT and PENDING tables.
- **Status:** Active

## 2026-07-30 — Stack Modernization
- **Decision:** Upgrade Next.js 14→16, React 18→19, Tailwind 3→4, Vitest 1→4
- **Context:** Resume preparation for 2027 hiring cycles
- **Alternatives:** Stay on v14 (rejected: outdated stack signal)
- **Impact:** package.json, next.config.mjs, src/app/globals.css, vitest.config.ts
- **Status:** Active

## 2026-07-30 — Gemini Model Update
- **Decision:** Replace gemini-2.5-flash with gemini-3.5-flash
- **Context:** gemini-2.5-flash shut down June 1, 2026
- **Alternatives:** gemini-3.1-pro (rejected: 3.5 Flash outperforms at lower cost)
- **Impact:** src/lib/gemini.ts
- **Status:** Active

## 2026-07-30 — Rate Limiter Rewrite
- **Decision:** Replace in-memory Map with Upstash Redis sliding window
- **Context:** Serverless functions don't share memory state
- **Alternatives:** Self-hosted Redis (rejected: free tier constraint)
- **Impact:** src/lib/rate-limiter.ts
- **Status:** Active

## 2026-07-30 — Async Job Architecture
- **Decision:** Use Inngest for LLM roadmap generation and certificate creation
- **Context:** 45s LLM calls block HTTP request threads
- **Alternatives:** BullMQ + Redis (rejected: more infra overhead)
- **Impact:** src/lib/inngest.ts, src/app/api/inngest/route.ts
- **Status:** Active

## 2026-07-30 — Realtime Push
- **Decision:** Use Supabase Realtime for job completion instead of client polling
- **Context:** Polling inflates serverless invocation counts
- **Alternatives:** WebSocket/SSE (rejected: incompatible with Vercel serverless)
- **Impact:** src/lib/realtime.ts
- **Status:** Active

## 2026-07-30 — Server Actions Migration
- **Decision:** Replace API routes with Next.js Server Actions
- **Context:** Type-safe client-server without fetch boilerplate
- **Alternatives:** tRPC (rejected: overkill for this scope)
- **Impact:** src/features/assessment/actions.ts, src/features/roadmap/actions.ts
- **Status:** Active

## 2026-07-30 — Razorpay Demo Mode
- **Decision:** Run payment layer in demo mode
- **Context:** No Razorpay API key available
- **Alternatives:** Remove payments entirely (rejected: webhook idempotency is good signal)
- **Impact:** src/lib/razorpay.ts, src/app/api/payments/webhook/route.ts
- **Status:** Active

## 2026-07-30 — Admin Consolidation
- **Decision:** Delete decoy /admin, rename /internal-admin-panel to /admin
- **Context:** Security through obscurity is an anti-pattern
- **Alternatives:** Keep both (rejected: double maintenance)
- **Impact:** src/app/admin/ deleted, src/app/internal-admin-panel/ → src/app/admin/
- **Status:** Active

## 2026-07-30 — Feature Triage
- **Decision:** Cut competitions, teams, public profiles, resources, free-ai-readiness
- **Context:** 25+ features made codebase unmaintainable
- **Alternatives:** Keep everything (rejected: diluted interview signal)
- **Impact:** Deleted src/app/competitions/, src/app/u/, src/app/resources/, etc.
- **Status:** Active

## 2026-07-30 — Passkeys Cut
- **Decision:** Do not implement WebAuthn/Passkeys. Use Supabase native TOTP for admin MFA only.
- **Context:** WebAuthn browser edge cases (Safari bugs, platform authenticator quirks) burn days for marginal interview signal.
- **Alternatives:** Full WebAuthn implementation (rejected: time sink, not core to assessment story)
- **Impact:** No new files. Admin MFA uses Supabase built-in TOTP.
- **Status:** Active

## 2026-07-30 — Sentry Integration
- **Decision:** Add Sentry error tracking with distributed tracing and session replay
- **Context:** Production observability is required for incident response; no error tracking existed
- **Alternatives:** LogRocket (rejected: paid), custom logging only (rejected: no distributed tracing)
- **Impact:** sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, src/lib/errors.ts
- **Status:** Active
