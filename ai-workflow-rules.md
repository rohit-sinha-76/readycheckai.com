# AI Workflow & Agent Rules — ReadyCheck AI

## The 3-Phase Rule

When implementing new features or refactoring modules, AI agents must strictly follow the 3-phase execution protocol:

1. **Phase 1: Contract Definition:** Define explicit TypeScript interfaces in `src/types/` and Zod validation schemas in `src/lib/schemas/` before writing implementation code.  
   *Existing Contract Files:* `src/types/api.ts`, `src/types/roadmap.ts`, `src/lib/schemas/assessment.ts`.
2. **Phase 2: Mock & Test Suite Setup:** Create or update Vitest test files in `src/__tests__/` covering valid payloads, edge cases, and error states.
3. **Phase 3: Implementation:** Implement core business logic in Server Actions (`src/lib/actions/`) or API route handlers (`src/app/api/`), ensuring 100% test pass rate (`npm test`).

## Forbidden Patterns

- ❌ **Do Not Generate Client-Side Scoring Code:** Answer keys and correctness evaluation logic must never be embedded in UI components or client bundles. All answer evaluation MUST remain server-side in `src/app/api/assessment/submit`.
- ❌ **Do Not Bypass LLM Output Repair:** Never call `JSON.parse()` on raw text returned from Google Gemini. Always route raw LLM responses through `parseGeminiResponse()` and `cleanJson()` in `src/lib/gemini.ts`.
- ❌ **Do Not Use Non-Timing-Safe Signature Checks:** Never perform HMAC signature verification using string equality (`===`). Always use `crypto.timingSafeEqual()` as demonstrated in `src/lib/razorpay.ts`.
- ❌ **Do Not Swallow Errors Silently:** Never catch exceptions without logging to Pino logger (`logger.error({ err }, 'Message')` in `src/lib/logger.ts`) and returning structured error objects.
- ❌ **Do Not Create Duplicate Route Directories:** Never create redundant route paths (e.g. creating both `/admin` and `/internal-admin-panel`). Always consolidate logic into canonical App Router routes.

## File Editing Rules

1. **Edit Existing Files First:** Always inspect and edit existing files using code edit tools (`replace_file_content` / `multi_replace_file_content`) rather than creating duplicate helper files.
2. **Never Modify Protected Directories:** Never modify `node_modules/`, `.next/`, `coverage/`, or `.git/`.
3. **Preserve Documentation & Comments:** Maintain existing JSDoc comments and docstrings unrelated to your edits.
4. **Mandatory Execution Verification:** Never declare a task complete without executing `npm test` and `npx tsc --noEmit` to verify clean execution.

## Verification Checklist

Before submitting code changes or declaring completion, AI agents must verify:

- [ ] All 261 automated Vitest tests pass cleanly (`npm test`).
- [ ] TypeScript strict mode compilation succeeds with 0 errors (`npx tsc --noEmit`).
- [ ] ESLint linting rules pass (`npm run lint`).
- [ ] Zod schema validation is applied to all incoming user payloads.
- [ ] All database queries comply with Supabase Row Level Security (RLS) policies.
- [ ] Structured Pino logging (`src/lib/logger.ts`) is used instead of unformatted `console.log` in server actions.

## Error Handling for Agents

When an operation or external service integration fails during execution:

1. **Log Diagnostic Evidence:** Capture full, untruncated stack trace and log context via Pino logger (`src/lib/logger.ts`).
2. **Fail Fast with Structured Errors:** Throw typed application errors or return standardized error payloads via `createErrorResponse(message, statusCode)` in `src/lib/auth.ts`.
3. **Execute Fallback Mechanisms:** For LLM quota errors (HTTP 429), automatically execute model fallback from `gemini-2.5-flash` to `gemini-1.5-flash-latest` (`src/lib/gemini.ts`). For unconfigured payment keys, execute Demo Mode fallback (`src/lib/razorpay.ts`).
