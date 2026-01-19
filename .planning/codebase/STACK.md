# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- TypeScript 5.x - All application code (`app/`, `lib/`, `components/`, `features/`, `hooks/`)
- SQL - Database schema and migrations (`supabase/migrations/`)

**Secondary:**
- JavaScript - Service worker (`public/sw.js`, `public/sw-custom.js`)
- CSS - Global styles with Tailwind (`app/globals.css`)

## Runtime

**Environment:**
- Node.js (implied by Next.js 16)
- React 19.2.3 (latest React version)

**Package Manager:**
- pnpm
- Lockfile: `pnpm-lock.yaml` (present, 418KB)

## Frameworks

**Core:**
- Next.js 16.1.0 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- Tailwind CSS 4.x - Utility-first CSS framework

**UI Components:**
- shadcn/ui (radix-vega style) - Component library
- Radix UI - Headless primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, etc.)
- Plate.js 52.x - Rich text editor (`@platejs/*` packages)
- Framer Motion 12.x - Animations

**Testing:**
- Not detected in dependencies (no Jest, Vitest, or Playwright)

**Build/Dev:**
- PostCSS with `@tailwindcss/postcss`
- ESLint 9.x with Next.js config
- TypeScript compiler for type checking (`pnpm typecheck`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.89.0 - Database client
- `@supabase/ssr` 0.8.0 - Server-side Supabase with cookie handling
- `stripe` 20.1.1 - Server-side Stripe SDK
- `@stripe/stripe-js` 8.6.1 - Client-side Stripe SDK

**Rich Text Editor (Plate.js):**
- `platejs` 52.0.15 - Core editor
- `@platejs/ai` - AI-powered features
- `@platejs/basic-nodes`, `@platejs/code-block`, `@platejs/table`, `@platejs/list`, etc.
- `slate` 0.112.0, `slate-react` 0.112.0 - Editor foundation

**UI/UX:**
- `lucide-react` 0.562.0 - Icon library
- `react-hook-form` 7.69.0 + `@hookform/resolvers` 5.2.2 - Form handling
- `zod` 4.2.1 - Schema validation
- `cmdk` 1.1.1 - Command palette
- `sonner` 2.0.7 - Toast notifications
- `vaul` 1.1.2 - Drawer component
- `recharts` 3.6.0 - Charts/visualizations
- `cal-heatmap` 4.2.4 - Heatmap visualizations

**Drag & Drop:**
- `@dnd-kit/core` 6.3.1
- `@dnd-kit/sortable` 10.0.0
- `@dnd-kit/utilities` 3.2.2

**PWA/Offline:**
- `idb` 8.0.3 - IndexedDB wrapper for offline storage
- `web-push` 3.6.7 - Server-side push notifications

**PDF:**
- `@react-pdf/renderer` 4.3.1 - PDF generation
- `react-pdf` 10.3.0 - PDF viewing

**Utilities:**
- `date-fns` 4.1.0 - Date manipulation
- `clsx` 2.1.1, `tailwind-merge` 3.4.0 - Class name utilities
- `class-variance-authority` 0.7.1 - Component variants
- `next-themes` 0.4.6 - Dark/light mode

**Analytics:**
- `@vercel/analytics` 1.6.1 - Vercel Analytics integration

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` maps to root

**Tailwind CSS:**
- Config: Inline in `app/globals.css` (Tailwind v4 style)
- PostCSS config: `postcss.config.mjs`
- Base color: stone
- CSS variables enabled

**ESLint:**
- Config: `eslint.config.mjs` (flat config format)
- Extends: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`

**shadcn/ui:**
- Config: `components.json`
- Style: radix-vega
- Icon library: lucide
- Registries: Plate.js components from `https://platejs.org/r/{name}.json`

**Next.js:**
- Config: `next.config.ts`
- Remote image patterns: `*.supabase.co/storage/v1/object/public/**`

## Platform Requirements

**Development:**
- Node.js (version managed via runtime, no `.nvmrc`)
- pnpm package manager
- Environment variables for Supabase, Stripe, VAPID keys

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
OPENROUTER_API_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
NEXT_PUBLIC_APP_URL
```

**Production:**
- Vercel deployment (configured via `.mcp.json`)
- Supabase hosted database
- PWA-capable (manifest, service worker, offline support)

## NPM Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
```

---

*Stack analysis: 2026-01-19*
