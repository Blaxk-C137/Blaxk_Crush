# CrushBoard

**Professional partner acquisition.** A satirical “corporate recruitment”
platform, played with a completely straight face: instead of a dating app,
singles post **job listings** describing the partner they’re looking for.
Interested people discover a listing through a shared link and submit
anonymous **applications**. The lister reviews candidates from a hiring
dashboard and unseals identities one at a time — only when they choose to.

The UI is a polished, genuinely professional SaaS tool (no hearts, no pink,
no bubbly anything — the joke lives entirely in the framing).

---

## Quick start (zero config — demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **“Enter the demo workspace”**.

With no environment variables set, CrushBoard boots in **demo mode**: a
seeded in-memory backend with live listings and candidates, one-click demo
sign-in, and the full pipeline — anonymous applications, dedup, one-way
reveal, shortlist/reject, stats — all working locally. Nothing to provision.
(Demo data resets on server restart. Use Supabase mode for anything real.)

Demo dashboard entry points after signing in:

| What | Where |
|---|---|
| Positions overview | `/dashboard` |
| Candidate pipeline (reveal, stats, filters) | `/dashboard/<listingId>` |
| Public application portal | `/l/<slug>` (copy from any position card) |

---

## Production mode (Supabase)

Setting the Supabase env vars switches every flow to the real backend.
Copy `.env.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never in client code
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then:

1. **Database** — Supabase Dashboard → SQL Editor → run, in order:
   `supabase/migrations/001_initial_schema.sql` (tables, RLS, masking view)
   then `002_applicant_photos_storage.sql` (private photo bucket).
2. **Edge functions** —
   `supabase functions deploy check-dedup submit-application`
   (required for the applicant dedup/atomic-submit pipeline).
3. **Auth** — Dashboard → Authentication → URL Configuration:
   Site URL `http://localhost:3000`, redirect URL
   `http://localhost:3000/auth/callback` (add your production domain too).
   Magic-link sign-in works out of the box.
4. `npm run dev` — the login page now uses magic links instead of demo mode.

### Deploy to Vercel

Push the repo, import it in Vercel, set the four env vars above
(`NEXT_PUBLIC_APP_URL` = your production URL), deploy. Apply the same
migrations + edge functions to your production Supabase project and add the
production `/auth/callback` redirect URL.

---

## What’s inside

- **Lister flow** — magic-link auth, protected `/dashboard`, create/edit
  positions, shareable application-portal links, active/closed toggle.
- **Applicant flow** — no account needed; ToS gate (scroll-to-accept,
  consent recorded); silent dedup check (FingerprintJS + localStorage UUID);
  application form with photo upload; success / already-applied /
  position-closed states.
- **Candidate pipeline** — anonymous applicant cards backed by the
  `applications_masked` view (identity fields are `NULL` until reveal),
  stats row, All / New / Shortlisted / Rejected filters, confirm-dialog
  **one-way reveal**, shortlist/reject/undo, signed photo URLs.
- **Security** — RLS on every table, zero client access to `dedup_checks`,
  service-role key confined to server-only modules, ownership enforced in
  every server action, masked view is the only read path for applicants.
- **UI system** — [shadcn/ui](https://ui.shadcn.com) (new-york, Radix
  primitives) plus 21st.dev / Magic UI components (Border Beam, Shimmer
  Button, Dot Pattern, Number Ticker, Blur Fade, Animated Shiny Text) and
  Framer Motion — tuned to the spec’s “straight-faced corporate” tone
  (zinc palette + one indigo accent, Inter).

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui +
Radix UI · Framer Motion · Supabase (PostgreSQL, Auth, Storage, Edge
Functions) · FingerprintJS · Vitest

## Project structure

```
app/                     App Router pages, layouts, route handlers, server actions
  api/                   Demo-mode dedup/submit routes, ToS, signed photo URL
  auth/                  login, OAuth callback, logout, demo sign-in
  dashboard/             protected lister console (+ server actions)
  l/[slug]/              public application portal (OG metadata per listing)
components/
  ui/                    shadcn/ui primitives
  magic/                 21st.dev / Magic UI-style animated components
  listing|application/   feature components (cards, forms, reveal dialog)
  tos/                   Terms-of-Service gate + modal
lib/
  server/                backend selector + seeded demo backend (server-only)
  supabase/              browser / SSR / admin clients + shared types
  *.ts                   validation, masking, stats, dedup, fingerprint helpers
supabase/
  migrations/            001 schema + RLS + masked view, 002 storage bucket
  functions/             check-dedup, submit-application (Deno edge functions)
CLAUDE.md                original product/architecture spec
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest suite (49 tests: validation, masking, dedup, demo backend…) |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit` |

## Notes & decisions

- **Mutations go through server actions** (`app/dashboard/actions.ts`)
  rather than direct browser→Supabase writes. RLS still applies in
  Supabase mode; the same actions transparently serve the demo backend,
  and validation is re-run server-side.
- **`applications_masked` is the only applicant read path** for listers.
  Identity columns are `NULL` until `is_revealed = true`; reveal is one-way
  and permanent (spec §12).
- **Photo privacy** — the bucket is private; view URLs are minted
  server-side per request after verifying listing ownership
  (`/api/applications/[id]/photo`), with 1-hour signed URLs in Supabase mode.
- **Demo mode is for evaluation**, not production: the in-memory store is
  per-process and resets on restart.
- **Rotate your Supabase keys** if you lifted them from a shared export —
  `.env.local` (with real secrets) must never be committed; `.gitignore`
  covers all env files.

For entertainment purposes. 18+.
