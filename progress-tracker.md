# Progress Tracker

## DONE
| Feature | Date | Key Files |
|---------|------|-----------|
| Stack upgrade (Next.js 16, React 19, Tailwind 4, Vitest 4) | 2026-07-30 | package.json |
| Feature-based directory restructure | 2026-07-30 | src/features/ |
| Dead code deletion (competitions, teams, Socket.io) | 2026-07-30 | — |
| Gemini model fix (3.5 Flash) | 2026-07-30 | src/lib/gemini.ts |
| Upstash Redis rate limiter | 2026-07-30 | src/lib/rate-limiter.ts |
| Inngest async queue | 2026-07-30 | src/lib/inngest.ts |
| Supabase Realtime push | 2026-07-30 | src/lib/realtime.ts |
| Server Actions migration | 2026-07-30 | src/features/assessment/actions.ts |
| Admin audit logging | 2026-07-30 | src/features/admin/audit.ts |
| Razorpay demo mode + webhook idempotency | 2026-07-30 | src/lib/razorpay.ts |
| Database migrations (audit log, roadmap status, webhook dedup) | 2026-07-30 | supabase/migrations/ |
| Sentry error tracking | 2026-07-30 | sentry.client.config.ts, sentry.server.config.ts |
| PDF certificate generation & Inngest job | 2026-08-04 | src/lib/inngest.ts |
| LLM response caching via Upstash Redis | 2026-08-04 | src/lib/gemini.ts |
| Rate limiter in-memory sliding window fallback | 2026-08-04 | src/lib/rate-limiter.ts |

## IN PROGRESS
| Feature | Blocker | Next Step |
|---------|---------|-----------|
| None | — | All current roadmap tasks completed |

## PENDING
| Feature | Depends On | Priority |
|---------|-----------|----------|
| React Compiler optimization | Stable in React 19 | P3 |

## CUT
| Feature | Reason | Date |
|---------|--------|------|
| Competitions | Out of scope | 2026-07-30 |
| Teams | Depends on competitions | 2026-07-30 |
| Public Profiles | Social feature creep | 2026-07-30 |
| Resources | Static content, no signal | 2026-07-30 |
| Free AI Readiness | Duplicate of Assessment | 2026-07-30 |
| Passkeys / WebAuthn | Low signal, high debug cost | 2026-07-30 |

## KNOWN DEBT
| Issue | Severity | File | Plan |
|-------|----------|------|------|
| html2canvas stagnant | P2 | package.json | Migrate to server-side PDF |
