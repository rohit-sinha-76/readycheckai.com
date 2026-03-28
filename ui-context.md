# UI Context & Design System — ReadyCheck AI

## Design System

- **Styling Framework:** Tailwind CSS 3.4.0 (`tailwind.config.js`) with PostCSS 8.5.6 and Autoprefixer.
- **Color Tokens (Dark Mode Default):**
  - Background (Canvas): Slate 950 (`#020617` / `hsl(222.2, 84%, 4.9%)`)
  - Card / Surface: Slate 900 (`#0f172a` / `hsl(222.2, 47.4%, 11.2%)`)
  - Primary Accent: Royal Blue 500 (`#3b82f6` / `hsl(217.2, 91.2%, 59.8%)`)
  - Success / Passed: Emerald 500 (`#10b981`)
  - Warning / Danger: Amber 500 (`#f59e0b`) / Rose 500 (`#f43f5e`)
  - Border / Divider: Slate 800 (`#1e293b`)
  - Text Primary: Slate 50 (`#f8fafc`)
  - Text Muted: Slate 400 (`#94a3b8`)
- **Typography Scale:**
  - Font Sans: Inter / System UI (`font-sans`)
  - Font Mono: JetBrains Mono (`font-mono`)
  - H1 Display: 36px (`text-4xl font-bold tracking-tight`)
  - H2 Heading: 28px (`text-2xl font-semibold`)
  - H3 Subheading: 20px (`text-xl font-medium`)
  - Body Text: 16px (`text-base font-normal`)
  - Meta Label: 14px (`text-sm font-normal text-muted-foreground`)

## Component Library

### Radix UI Primitives (`package.json`)
- `@radix-ui/react-dialog` (v1.0.5) — Modal dialog containers
- `@radix-ui/react-accordion` (v1.2.12) — Collapsible content panels
- `@radix-ui/react-select` (v2.2.6) — Custom dropdown selectors
- `@radix-ui/react-progress` (v1.0.3) — Assessment progress bars
- `@radix-ui/react-radio-group` (v1.3.8) — Option choice selectors
- `@radix-ui/react-slider` (v1.3.6) — Range slider controls
- `@radix-ui/react-collapsible` (v1.1.12) — Expandable roadmap items

### Physical Custom Components (`src/components/`)
- `src/components/assessment/AssessmentEngine.tsx` — Timed evaluation canvas & question stepper
- `src/components/assessment/AssessmentTimer.tsx` — Real-time countdown timer bar
- `src/components/assessment/AssessmentResults.tsx` — Score summary & breakdown cards
- `src/components/assessment/AssessmentDashboard.tsx` — User assessment statistics grid
- `src/components/assessment/HonorCodeMonitor.tsx` — Proctoring listener (focus lost & copy prevention)
- `src/components/assessment/QuestionCard.tsx` — Multiple-choice question card
- `src/components/roadmap/GenerateRoadmapForm.tsx` — AI roadmap generation form
- `src/components/roadmap/RoadmapView.tsx` — Interactive roadmap timeline viewer
- `src/components/layout/header.tsx` — Global header navigation bar
- `src/components/layout/footer.tsx` — Platform footer links & copyright
- `src/components/layout/ThemeToggle.tsx` — Dark/light mode switcher
- `src/components/layout/Logo.tsx` — ReadyCheck AI brand logo

## Responsive Strategy

- **Mobile-First Layout:** Default layouts stack vertically (`w-full flex-col`).
- **Breakpoints (`tailwind.config.js`):**
  - `sm` (640px): Compact card grids and horizontal button rows.
  - `md` (768px): Two-column dashboard layout and expanded header navigation.
  - `lg` (1024px): Three-column stats grid and side-by-side assessment canvas.
  - `xl` (1280px): Centered container max-width wrapper (`max-w-7xl mx-auto px-4`).

## Dark Mode

- **Manager:** Next Themes (`next-themes` v0.4.6).
- **Configuration:** `attribute="class"` enabled on `ThemeProvider` in `src/components/providers/theme-provider.tsx`.
- **Toggle Component:** `src/components/layout/ThemeToggle.tsx` switches between dark, light, and system themes without SSR hydration mismatches.

## Forms

- **Form State & Resolution:** React Hook Form (`react-hook-form` v7.51.0) with Zod resolvers (`@hookform/resolvers` v3.3.0).
- **Validation:** Zod schemas in `src/lib/schemas/` validate input constraints before submission.
- **Error Display Pattern:** Dynamic error text rendered via Radix `<Label>` and `text-destructive` helper spans below invalid inputs.
- **Form Components:** `src/components/roadmap/GenerateRoadmapForm.tsx` (AI roadmap creation), `src/app/auth/login/page.tsx` (Authentication login).

## Accessibility

- **Target Standard:** WCAG 2.1 AA compliance.
- **Implementations:**
  - Focus Traps: Radix UI primitives manage focus trap and keyboard ESC closure inside `<Dialog>` modals.
  - Focus Rings: Keyboard navigation rings enforced via `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`.
  - Screen Reader Announcements: `<AssessmentTimer />` includes `aria-live="polite"` and `aria-atomic="true"` for time warning announcements.
  - Form Labeling: All inputs explicitly bound to Radix `<Label>` components using matching `htmlFor` attributes.
