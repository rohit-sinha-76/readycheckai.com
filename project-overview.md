# ReadyCheckAI

**Version:** 1.0.0  
**Last Updated:** 2026-07-30

## Purpose
AI-powered readiness assessment platform. Users take timed 18-question tests across 4 tracks, receive AI-generated learning roadmaps, and earn shareable certificates.

## Tech Stack
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.2.12 | App Router, Server Components, Turbopack |
| UI | React | 19.2.8 | Server Components, React Compiler |
| Styling | Tailwind CSS | 4.0.0 | Oxide engine, CSS-native config |
| Database | Supabase | 2.56.0 | Postgres 15, Auth, Realtime |
| AI | Google Gemini | 3.5 Flash | Question generation, roadmap creation |
| Rate Limit | Upstash Redis | latest | Distributed sliding window |
| Async Jobs | Inngest | latest | Roadmap generation, certificate creation |
| Payments | Razorpay | 2.9.2 | Demo mode — HMAC verification implemented, no live key |
| Error Tracking | Sentry | latest | Distributed tracing, session replay |
| Testing | Vitest | 4.0.0 | Unit + integration tests |

## Golden Path Features
1. **Auth** — Email/password + Supabase Auth, admin MFA via TOTP
2. **Assessment** — 18-question timed test, Gemini-generated questions, honor code monitoring
3. **Results** — Score breakdown, pass/fail at 60%, certificate generation
4. **Roadmap** — Async AI-generated learning path via Inngest queue
5. **Dashboard** — Assessment history, progress tracking, RSC data fetching

## Constraints
- Free tier only: Vercel Hobby, Supabase Free, Upstash, Inngest, Sentry
- Target: 100 users, architected to scale to 10k in interviews
- Razorpay in demo mode (`RAZORPAY_DEMO_MODE=true`) — architectural correctness over live transactions
- No Passkeys/WebAuthn — Supabase native TOTP for admin MFA only

## Entry Points
```bash
npm run dev      # localhost:3000
npm run build    # production build
npm run test     # Vitest suite
```
