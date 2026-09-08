# CLAUDE.md — CrushBoard

> **What this file is:** Complete project specification, architecture reference, and build guide for CrushBoard.
> Keep this file at the project root. Update it as decisions change.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project File Structure](#3-project-file-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Row Level Security (RLS)](#6-row-level-security-rls)
7. [Supabase Edge Functions](#7-supabase-edge-functions)
8. [User Flows](#8-user-flows)
9. [Dedup Mechanism](#9-dedup-mechanism)
10. [Terms of Service Flow](#10-terms-of-service-flow)
11. [Form Design & Field Reference](#11-form-design--field-reference)
12. [Dashboard Design](#12-dashboard-design)
13. [Design System & Tone](#13-design-system--tone)
14. [Key Architectural Decisions](#14-key-architectural-decisions)
15. [Build Roadmap](#15-build-roadmap)

---

## 1. Project Overview

**CrushBoard** is a satirical "corporate recruitment" platform for singles. Instead of a traditional dating app, it frames partner-seeking as a job listing. Singles post "job listings" describing the kind of partner they want. Interested people discover the listing via a shared link and submit anonymous "applications." The lister reviews applicants through a dashboard, revealing details one by one only when they choose to.

**Tagline:** *"Professional partner acquisition."*

### Core Product Rules

| Rule | Rationale |
|---|---|
| Listers must sign up. Applicants do not. | Reduces friction for applicants, keeps listers accountable. |
| Applicants are fully anonymous until the lister reveals them. | Lowers the social stakes of applying. |
| Reveal is one-way and permanent. | Prevents lister from gaming the reveal. |
| One application per person per listing. | Enforced via fingerprint + localStorage UUID dedup. |
| Listings are accessed only via unique link — no browse/discovery feed. | Keeps connections intentional. Not a marketplace. |
| ToS must be accepted before any action on the site. | Legal coverage for data handling and consent storage. |

### What Makes It Different

No algorithmic feed. No mutual-swipe requirement. No account needed to apply. The lister controls the pacing entirely. The satirical corporate framing — "Seeking: Chief Happiness Officer", "Compensation Package", "Preferred Qualifications" — is not decoration; it's the product personality and what makes it shareable.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | **Next.js 14** (App Router) | Use server components where possible |
| Styling | **Tailwind CSS** | Utility-first, no CSS modules |
| Hosting | **Vercel** | Connected to GitHub repo, auto-deploy on push |
| Database | **Supabase** (PostgreSQL) | Primary data store |
| Auth | **Supabase Auth** | Magic link + Google OAuth, listers only |
| Storage | **Supabase Storage** | Applicant photo uploads |
| Edge Functions | **Supabase Edge Functions** (Deno) | Dedup check, secure writes |
| Fingerprinting | **FingerprintJS** (free tier) | `@fingerprintjs/fingerprintjs` |
| Email (optional) | **Resend** (free tier) | Notify lister of new applications |
| Type safety | **TypeScript** | Strict mode on |

### Supabase Client Setup

Three clients are needed:

```ts
// lib/supabase/client.ts — browser client (anon key)
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts — cookie-aware SSR client (server components, route handlers)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    }
  )
}

// lib/supabase/admin.ts — service role client (server-side use only,
// never import from app/ or components/; import 'server-only' guards it)
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## 3. Project File Structure

```
crushboard/
├── CLAUDE.md                          ← this file
├── .env.local                         ← never commit this
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── app/
│   ├── layout.tsx                     ← root layout, TOS modal logic
│   ├── page.tsx                       ← home / landing page
│   │
│   ├── auth/
│   │   ├── login/page.tsx             ← lister login / signup
│   │   ├── callback/route.ts          ← Supabase auth callback handler
│   │   └── logout/route.ts
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                 ← protected: redirect if not authed
│   │   ├── page.tsx                   ← lister's listing overview
│   │   ├── create/page.tsx            ← new listing form
│   │   └── [listingId]/
│   │       ├── page.tsx               ← applicant dashboard for one listing
│   │       └── edit/page.tsx          ← edit listing (owner only)
│   │
│   └── l/
│       └── [slug]/
│           └── page.tsx               ← public listing view + apply form
│
├── components/
│   ├── tos/
│   │   └── TosModal.tsx               ← full-screen ToS overlay
│   ├── listing/
│   │   ├── ListingForm.tsx            ← create/edit listing
│   │   ├── ListingCard.tsx            ← card for dashboard overview
│   │   └── ListingView.tsx            ← public-facing listing display
│   ├── application/
│   │   ├── ApplicationForm.tsx        ← applicant submit form
│   │   ├── ApplicantCard.tsx          ← dashboard card (anonymous/revealed)
│   │   └── RevealButton.tsx           ← one-way reveal trigger
│   └── ui/
│       ├── Badge.tsx                  ← status badges (New, Shortlisted, etc.)
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Textarea.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  ← browser client
│   │   ├── server.ts                  ← cookie-aware SSR client
│   │   ├── admin.ts                   ← service-role client (server-only)
│   │   └── types.ts                   ← generated DB types (supabase gen types)
│   ├── fingerprint.ts                 ← FingerprintJS initializer + caching
│   ├── localStorage.ts                ← UUID helpers, ToS flag helpers
│   └── utils.ts                       ← general helpers
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql     ← full schema + RLS + indexes
│   └── functions/
│       ├── check-dedup/index.ts       ← dedup check edge function
│       └── submit-application/index.ts ← atomic submit + dedup edge function
│
└── public/
    └── og-image.png                   ← Open Graph image for link sharing
```

---

## 4. Environment Variables

```env
# .env.local

# Supabase — public (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase — private (server/edge only, NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# FingerprintJS (optional — free tier needs no key, Pro does)
NEXT_PUBLIC_FPJS_API_KEY=

# Resend (optional — for new application email notifications)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://crushboard.app
```

> **Hard rule:** `SUPABASE_SERVICE_ROLE_KEY` never appears in any file under `app/` or `components/`. It is used exclusively inside `supabase/functions/` and `app/api/` server routes. If you ever see this key in a client component, it is a critical security leak.

---

## 5. Database Schema

Run this as a single Supabase migration. Order matters due to foreign key dependencies.

```sql
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE work_mode AS ENUM ('local', 'long_distance', 'open');
CREATE TYPE application_status AS ENUM ('pending', 'shortlisted', 'rejected');

-- ============================================================
-- TABLE: listings
-- Created by authenticated listers.
-- ============================================================

CREATE TABLE listings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  -- Content
  title         TEXT NOT NULL,           -- "Seeking: Chief Happiness Officer"
  about         TEXT NOT NULL,           -- what they're looking for
  requirements  TEXT NOT NULL,           -- must-haves
  nice_to_have  TEXT,                    -- preferred qualifications
  perks         TEXT,                    -- compensation package (what they bring)
  location      TEXT,                    -- where they are based
  work_mode     work_mode DEFAULT 'open',
  age_min       INTEGER DEFAULT 18,
  age_max       INTEGER DEFAULT 99,
  deadline      TIMESTAMPTZ,             -- nullable, application cutoff
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Candidate age range must be valid
  CONSTRAINT valid_age_range CHECK (age_min < age_max)
);

-- ============================================================
-- TABLE: applications
-- Submitted by anonymous applicants.
-- Sensitive fields are NULL when is_revealed = false (enforced by RLS view).
-- ============================================================

CREATE TABLE applications (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Dedup identifiers (never shown to lister)
  fingerprint_hash      TEXT NOT NULL,
  local_storage_uuid    TEXT NOT NULL,

  -- Always visible to lister (anonymized, no PII)
  bio                   TEXT NOT NULL,   -- "cover letter" — visible before reveal
  why_apply             TEXT NOT NULL,   -- "why this role" — visible before reveal

  -- Hidden until is_revealed = true
  name                  TEXT NOT NULL,
  age                   INTEGER NOT NULL,
  applicant_location    TEXT,
  photo_url             TEXT,            -- Supabase Storage path
  social_link           TEXT,

  -- State
  is_revealed           BOOLEAN DEFAULT false NOT NULL,
  status                application_status DEFAULT 'pending' NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Applicants must be 18 or older
  CONSTRAINT adult_applicant CHECK (age >= 18)
);

-- ============================================================
-- TABLE: dedup_checks
-- Fast lookup for application uniqueness per listing.
-- Client has zero access — read/write only via edge function.
-- ============================================================

CREATE TABLE dedup_checks (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  fingerprint_hash      TEXT NOT NULL,
  local_storage_uuid    TEXT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Both constraints: catches same device across browsers AND same browser after fingerprint change
  UNIQUE (listing_id, fingerprint_hash),
  UNIQUE (listing_id, local_storage_uuid)
);

-- ============================================================
-- TABLE: tos_acceptances
-- Proof of consent. Insert only. No reads.
-- Stores fingerprint + UUID pair at time of acceptance.
-- ============================================================

CREATE TABLE tos_acceptances (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash      TEXT NOT NULL,
  local_storage_uuid    TEXT NOT NULL,
  accepted_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_listings_user_id     ON listings(user_id);
CREATE INDEX idx_listings_slug        ON listings(slug);
CREATE INDEX idx_applications_listing ON applications(listing_id);
CREATE INDEX idx_dedup_fingerprint    ON dedup_checks(listing_id, fingerprint_hash);
CREATE INDEX idx_dedup_uuid           ON dedup_checks(listing_id, local_storage_uuid);
```

---

## 6. Row Level Security (RLS)

Enable RLS on every table and define explicit policies. Default deny — everything not explicitly permitted is blocked.

```sql
-- ============================================================
-- Enable RLS
-- ============================================================

ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedup_checks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tos_acceptances   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- listings: public read, owner write
-- ============================================================

CREATE POLICY "Listings are publicly readable"
  ON listings FOR SELECT USING (true);

CREATE POLICY "Listers can create their own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Listers can update their own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Listers can delete their own listings"
  ON listings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- applications: edge function handles inserts via service role.
-- Listers read their own listing's applications.
-- Sensitive columns masked when is_revealed = false via a VIEW.
-- ============================================================

-- Listers can only read applications for listings they own
CREATE POLICY "Listers read applications on their listings"
  ON applications FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );

-- Listers can update status and reveal on their listing's applications
CREATE POLICY "Listers can update application status and reveal"
  ON applications FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );

-- No direct INSERT from client — handled by edge function with service role
-- No DELETE policy — applications are permanent once submitted

-- ============================================================
-- dedup_checks: no client access at all — service role only
-- ============================================================

-- No policies created = total deny for all authenticated and anonymous clients
-- Edge function uses service role key, bypasses RLS entirely

-- ============================================================
-- tos_acceptances: insert only, no reads
-- ============================================================

CREATE POLICY "Anyone can log ToS acceptance"
  ON tos_acceptances FOR INSERT
  WITH CHECK (true);

-- No SELECT policy = nobody can read the table from client
```

> **Accepted risk:** the SELECT policy above grants listers access to the raw `applications` table, including identity columns, so a lister who queries the REST API directly (rather than the dashboard) can read name, photo, and contact info without revealing. `applications_masked` is the application-layer contract, not a database-level guarantee. This is accepted for this product's stakes — the lister already controls the reveal, so the exposure is limited to the lister reading their own applicants' details early — and will be revisited if the threat model changes.

### Masking Sensitive Columns

Rather than handling this in application code, create a **view** that automatically masks sensitive fields when `is_revealed = false`. Use this view in the dashboard, never the raw table.

```sql
CREATE VIEW applications_masked WITH (security_invoker = on) AS
SELECT
  id,
  listing_id,
  bio,
  why_apply,
  is_revealed,
  status,
  created_at,
  CASE WHEN is_revealed THEN name           ELSE NULL END AS name,
  CASE WHEN is_revealed THEN age::TEXT      ELSE NULL END AS age,
  CASE WHEN is_revealed THEN applicant_location ELSE NULL END AS applicant_location,
  CASE WHEN is_revealed THEN photo_url      ELSE NULL END AS photo_url,
  CASE WHEN is_revealed THEN social_link    ELSE NULL END AS social_link
FROM applications;
```

> The view uses `security_invoker = on` so the RLS policies on `applications` apply through it — without this, the view would execute with its owner's privileges and bypass row-level security entirely.

> The dashboard queries `applications_masked`, never `applications` directly.

---

## 7. Supabase Edge Functions

### Function 1: `check-dedup`

Called when an applicant lands on a listing page. Returns whether they are already blocked.

**Endpoint:** `POST /functions/v1/check-dedup`

```ts
// supabase/functions/check-dedup/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { listing_id, fingerprint_hash, local_storage_uuid } = await req.json()

  if (!listing_id || !fingerprint_hash || !local_storage_uuid) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('dedup_checks')
    .select('id')
    .eq('listing_id', listing_id)
    .or(`fingerprint_hash.eq.${fingerprint_hash},local_storage_uuid.eq.${local_storage_uuid}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ already_applied: !!data }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

### Function 2: `submit-application`

Atomic submit: dedup check + insert into `applications` + insert into `dedup_checks` in a single server-side operation. The client cannot insert directly.

**Endpoint:** `POST /functions/v1/submit-application`

```ts
// supabase/functions/submit-application/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const body = await req.json()
  const {
    listing_id, fingerprint_hash, local_storage_uuid,
    name, age, applicant_location, bio, why_apply, photo_url, social_link
  } = body

  // Validate required fields
  const required = [listing_id, fingerprint_hash, local_storage_uuid, name, age, bio, why_apply]
  if (required.some(f => !f)) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Re-check dedup server-side (never trust the client check alone)
  const { data: existing } = await supabase
    .from('dedup_checks')
    .select('id')
    .eq('listing_id', listing_id)
    .or(`fingerprint_hash.eq.${fingerprint_hash},local_storage_uuid.eq.${local_storage_uuid}`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return new Response(
      JSON.stringify({ error: 'already_applied' }),
      { status: 409 }
    )
  }

  // 2. Insert application
  const { data: application, error: appError } = await supabase
    .from('applications')
    .insert({
      listing_id, fingerprint_hash, local_storage_uuid,
      name, age, applicant_location, bio, why_apply, photo_url, social_link
    })
    .select('id')
    .single()

  if (appError) {
    return new Response(JSON.stringify({ error: appError.message }), { status: 500 })
  }

  // 3. Insert dedup record
  await supabase.from('dedup_checks').insert({
    listing_id, fingerprint_hash, local_storage_uuid
  })

  return new Response(
    JSON.stringify({ success: true, application_id: application.id }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## 8. User Flows

### Lister Flow

```
1. Lands on crushboard.app
   → ToS modal fires (if not accepted)
   → Accepts ToS

2. Clicks "Post Your Listing" → /auth/login
   → Enters email → Supabase sends magic link
   → OR clicks "Continue with Google"
   → Supabase session established
   → Redirected to /dashboard

3. /dashboard/create → fills out listing form
   → Submits → INSERT into listings
   → Redirected to /dashboard/[listingId]
   → Receives unique shareable link: crushboard.app/l/[slug]

4. Shares link (DMs, social, bio link, wherever)

5. Returns to /dashboard/[listingId]
   → Sees applicant cards (all anonymous)
   → Can filter by status: All / New / Shortlisted / Rejected

6. Clicks "Review Application" on a card
   → Calls Supabase UPDATE: is_revealed = true, status = 'pending' → 'reviewed'
   → Card re-renders with full details (name, photo, age, location, social)
   → Lister reaches out externally via social link or other means

7. Updates status to Shortlisted or Rejected
```

### Applicant Flow

```
1. Receives link from lister (crushboard.app/l/[slug])

2. Lands on /l/[slug]
   → FingerprintJS loads and generates hash F
   → localStorage UUID L is retrieved or freshly generated
   → ToS modal fires (first visit) → must accept before anything else

3. ToS accepted
   → POST to tos_acceptances table (F, L, timestamp)
   → localStorage flag 'tos_v1' = timestamp set

4. Dedup check runs (silently, in background)
   → POST to /functions/v1/check-dedup with { listing_id, F, L }
   → If already_applied = true:
       → Show: "You've already applied to this listing. We'll let you know if things progress. 🤞"
       → Application form is hidden
   → If already_applied = false:
       → Show the listing content
       → Reveal the application form

5. Applicant reads the listing and fills out the form

6. Submits form
   → Photo uploaded to Supabase Storage (if provided)
   → POST to /functions/v1/submit-application with all fields
   → Edge function: re-checks dedup, inserts application + dedup record atomically
   → Success: show confirmation screen
       → "Application submitted. The ball's in their court now."
   → 409 conflict (race condition): show "looks like you already applied"
```

---

## 9. Dedup Mechanism

**Why fingerprint + localStorage together:**

| Mechanism | Bypassed by | Reliability |
|---|---|---|
| Cookies only | Clearing cookies / incognito | Very low |
| localStorage only | Clearing site data | Low |
| Email | Creating a new email address | Low (Gmail + variations) |
| Fingerprint only | Switching browser / VPN / incognito | Medium |
| **Fingerprint + localStorage combined** | Must switch browser AND clear storage AND generate a new fingerprint | Medium-high |

No client-side enforcement is perfect. This is friction, not a lock. The stakes (a crush app) are proportionate to the solution.

### Client-side Implementation

```ts
// lib/fingerprint.ts
import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cachedFingerprint: string | null = null

export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  cachedFingerprint = result.visitorId
  return cachedFingerprint
}
```

```ts
// lib/localStorage.ts
import { v4 as uuidv4 } from 'uuid'

const LS_UUID_KEY = 'cb_visitor_uuid'
const TOS_KEY = 'tos_v1'

export function getOrCreateVisitorUUID(): string {
  let uuid = localStorage.getItem(LS_UUID_KEY)
  if (!uuid) {
    uuid = uuidv4()
    localStorage.setItem(LS_UUID_KEY, uuid)
  }
  return uuid
}

export function hasTosAccepted(): boolean {
  return !!localStorage.getItem(TOS_KEY)
}

export function setTosAccepted(): void {
  localStorage.setItem(TOS_KEY, new Date().toISOString())
}
```

### Dedup Check on Listing Page Load

```ts
import { callEdgeFunction } from '@/lib/edge'

// Called inside the listing page component on mount
async function runDedupCheck(listingId: string): Promise<boolean> {
  const fingerprint = await getFingerprint()
  const uuid = getOrCreateVisitorUUID()

  const { data } = await callEdgeFunction<{ already_applied: boolean }>(
    'check-dedup',
    {
      listing_id: listingId,
      fingerprint_hash: fingerprint,
      local_storage_uuid: uuid
    }
  )

  return data.already_applied
}
```

> The browser calls the edge function directly with the anon key (`@/lib/edge`'s `callEdgeFunction`) — there is no Next.js API route in front of it.

---

## 10. Terms of Service Flow

ToS acceptance is **non-negotiable** and fires on every new device/browser. It is the legal basis for:
- Processing fingerprint data (device identification)
- Storing consent records in `tos_acceptances`
- Associating submitted data with a fingerprint hash

### Implementation

**Step 1 — Root layout checks localStorage:**
```ts
// app/layout.tsx
// On mount (client component), check hasTosAccepted()
// If false → render <TosModal /> over entire page content (z-index: max)
// TosModal is non-dismissable — no close button, no click-outside
```

**Step 2 — TosModal component:**
- Full-screen overlay with `position: fixed`, `inset: 0`, `z-index: 9999`
- Scrollable ToS text (user must scroll to bottom to unlock the accept button)
- "I agree to the Terms of Service" button — only enabled after scroll-to-bottom
- On click: calls `setTosAccepted()` in localStorage + POSTs to Supabase

**Step 3 — Supabase insert:**
```ts
await supabase.from('tos_acceptances').insert({
  fingerprint_hash: fingerprint,
  local_storage_uuid: uuid,
  accepted_at: new Date().toISOString()
})
```

**What the ToS must cover (consult a lawyer for final version):**
- The site is for entertainment/social purposes only
- No guarantee of any match or outcome
- Anonymous data (fingerprint hash) is collected for spam prevention
- Applicant data is stored and may be revealed to the listing owner at their discretion
- Users must be 18 or older
- No liability for interactions that occur after connection
- Data retention and deletion policy

---

## 11. Form Design & Field Reference

### Corporate Language Mapping

The entire UX is a corporate recruitment parody. Field labels use HR/recruitment language throughout.

### Listing Form (`/dashboard/create`)

| Field | Label displayed | Type | Required | Notes |
|---|---|---|---|---|
| `title` | Position Title | text input | ✅ | Placeholder: "Seeking: Chief Happiness Officer" |
| `about` | About the Role | textarea | ✅ | What they want in a partner |
| `requirements` | Key Requirements | textarea | ✅ | Non-negotiables |
| `nice_to_have` | Preferred Qualifications | textarea | ❌ | Soft preferences |
| `perks` | Compensation Package | textarea | ❌ | What the lister brings |
| `location` | Office Location | text input | ❌ | Where they are based |
| `work_mode` | Work Mode | select (3 options) | ✅ | On-site / Remote-friendly / Flexible |
| `age_min` / `age_max` | Candidate Profile | dual range slider | ✅ | Age range |
| `deadline` | Application Deadline | date picker | ❌ | Adds urgency to the listing |

**Work mode label mapping:**
```
local         → "On-site (local only)"
long_distance → "Remote-friendly"
open          → "Flexible / Open to both"
```

### Application Form (`/l/[slug]`)

| Field | Label displayed | Hidden until revealed? | Required |
|---|---|---|---|
| `name` | Full Name | ✅ Yes | ✅ |
| `age` | Years of Experience | ✅ Yes | ✅ |
| `applicant_location` | Current Location | ✅ Yes | ❌ |
| `bio` | About You | ❌ No (anonymized) | ✅ |
| `why_apply` | Cover Letter — Why This Role? | ❌ No (anonymized) | ✅ |
| `photo` | Professional Headshot | ✅ Yes | ❌ |
| `social_link` | Portfolio / LinkedIn | ✅ Yes | ❌ |

> `bio` and `why_apply` are visible to the lister from the start, but no name, photo, or contact info is attached. The lister sees *character* before *identity*.

### Photo Upload

Photos are uploaded directly to Supabase Storage from the client before form submission.

```ts
// On photo file selection:
const { data, error } = await supabase.storage
  .from('applicant-photos')
  .upload(`${listingId}/${uuid}-${Date.now()}`, file, {
    cacheControl: '3600',
    upsert: false
  })

// photo_url stored in applications row is the storage path
// Retrieve signed URL in dashboard only when is_revealed = true:
const { data: { signedUrl } } = await supabase.storage
  .from('applicant-photos')
  .createSignedUrl(photo_url, 3600) // 1hr expiry
```

**Supabase Storage bucket policy:**
- Bucket: `applicant-photos` — private (not public)
- No public reads
- Signed URLs generated server-side only, only for listing owners

---

## 12. Dashboard Design

### Route: `/dashboard/[listingId]`

**Stats row (top):**
```
[Total: 12]  [Shortlisted: 3]  [Pending: 7]  [Rejected: 2]
```

**Filter tabs:**
```
All  |  New  |  Shortlisted  |  Rejected
```

**Applicant Card (before reveal):**
```
┌─────────────────────────────────────────────┐
│  Applicant #4                    [New] badge │
│                                              │
│  "I believe I'd be a strong candidate for   │
│   this role because I bring seven years of  │
│   [truncated at 120 chars]..."               │
│                                              │
│  Applied: Oct 12, 2026                       │
│                                              │
│  [Review Application]  [Shortlist]  [Reject] │
└─────────────────────────────────────────────┘
```

**Applicant Card (after reveal):**
```
┌─────────────────────────────────────────────┐
│  [photo]  Amara Okafor, 26          [badge] │
│           Lagos, Nigeria                     │
│           instagram.com/amara               │
│                                              │
│  "Full cover letter text now visible..."     │
│                                              │
│  Applied: Oct 12, 2026                       │
│                                              │
│  [Shortlisted ✓]  [Reject]                  │
└─────────────────────────────────────────────┘
```

**Reveal action:**
```ts
// components/application/RevealButton.tsx
const handleReveal = async () => {
  if (!confirm('Reveal this applicant? This cannot be undone.')) return

  const { error } = await supabase
    .from('applications')
    .update({ is_revealed: true })
    .eq('id', applicationId)

  if (!error) refetchApplication()
}
```

**Status update:**
```ts
const updateStatus = async (status: 'shortlisted' | 'rejected') => {
  await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
}
```

### Listing Overview — `/dashboard`

Shows all the lister's active listings as cards. Each card shows: listing title, application count, date created, active/inactive toggle, link to applicant dashboard, and the shareable link with a copy button.

---

## 13. Design System & Tone

### Personality

CrushBoard is a **satirical product** with a straight face. The joke is in the framing, not in comic styling. The UI should look genuinely professional — like a polished SaaS recruitment tool — so the corporate language lands as clever rather than cheap.

Do not:
- Use hearts, pink colors, or romantic iconography anywhere
- Use playful fonts or bubbly UI
- Break the fourth wall in the UI copy

Do:
- Use neutral/professional color palette (slate, zinc, off-white, one accent)
- Use clean sans-serif typography (Inter or Geist)
- Write all UI copy in corporate recruitment language (see below)
- Let the concept be the personality — the UI is its straight man

### Copy Reference

| UI element | Copy |
|---|---|
| Sign up CTA | "Post a position" |
| Login CTA | "Sign in to your account" |
| Create listing button | "Open a new position" |
| Shareable link label | "Application portal" |
| Dashboard heading | "Active positions" |
| Applicant section heading | "Candidates" |
| Reveal button | "Review application" |
| Status: pending | "Under review" |
| Status: shortlisted | "Shortlisted" |
| Status: rejected | "Position filled / not a fit" |
| Already applied message | "You've already submitted an application for this position. We'll be in touch if you progress." |
| Application success | "Application received. We'll review it shortly." |
| Empty applicants state | "No applications yet. Share your portal link to start receiving candidates." |

### Responsive Design

- Mobile-first. The most common use case is someone receiving a link on their phone.
- Dashboard is the most complex view — ensure the applicant card grid degrades to single column gracefully.
- The application form should be fully usable on mobile with minimal horizontal scrolling.

---

## 14. Key Architectural Decisions

### Why not a traditional backend?

Supabase provides auth, database, storage, and edge functions under one managed service on a free/cheap tier. Combined with Vercel for hosting, the entire stack runs for free at hobby scale. A custom Node/Django backend would require a paid server and introduces DevOps overhead that doesn't serve a portfolio/early-stage project.

### Why Supabase Edge Functions for dedup — not a Next.js API route?

The `SUPABASE_SERVICE_ROLE_KEY` must never reach the browser. A Next.js API route (`/api/...`) would work, but it runs on Vercel's serverless infrastructure. Using Supabase Edge Functions keeps the sensitive logic co-located with the database, reduces latency (function runs in the same region as the DB), and means the service role key is an environment variable inside Supabase rather than Vercel — fewer places it can be accidentally exposed.

### Why fingerprint + localStorage instead of phone OTP?

Phone OTP would be the most reliable single-submission enforcement. However, it introduces significant friction (users abandon forms when they have to verify a number), requires a paid SMS service (Twilio), and adds complexity disproportionate to the stakes. On a social fun app where the consequence of a double-application is that a lister sees two cards — friction is the right tool, not a lock.

### Why are `bio` and `why_apply` visible before reveal?

Without any visible information, the lister has nothing to act on. Pure anonymity means they'd have to blindly reveal everyone to make any decisions, which defeats the purpose of the controlled reveal. The cover letter gives them *character* (personality, intention) without giving them *identity* (name, face, contact). This is the deliberate design tension of the product.

### Why is the reveal one-way and permanent?

Making it reversible creates a perverse incentive: a lister could reveal, get the details, then un-reveal to "reset" the applicant's perceived status. Permanent reveal keeps the interaction honest — once you've seen someone's details, that relationship has changed and shouldn't be pretended otherwise.

### Why a separate `dedup_checks` table instead of querying `applications`?

Querying `applications` for dedup would require the edge function to expose application data as part of the dedup lookup, and would create a table that needs to be both readable (for dedup) and write-controlled (for privacy). Separating dedup into its own table with zero client access keeps concerns clean and the `applications` table's access pattern simple.

---

## 15. Build Roadmap

Build in this order. Each phase is shippable.

### Phase 1 — Skeleton (Day 1–2)
- [ ] Initialize Next.js 14 project with TypeScript + Tailwind
- [ ] Connect Supabase: install client libraries, set up env variables
- [ ] Run migration: create all 5 tables + RLS policies
- [ ] Supabase Auth: magic link working for lister login/logout
- [ ] Protected `/dashboard` route (redirect to login if no session)

### Phase 2 — Lister Core (Day 3–4)
- [ ] Listing creation form (`/dashboard/create`) with all fields
- [ ] Insert listing to Supabase, generate slug
- [ ] Dashboard overview page showing active listings
- [ ] Shareable link display + copy-to-clipboard
- [ ] Listing edit page (owner only, enforced by RLS)

### Phase 3 — Public Listing & Application (Day 5–7)
- [ ] Public listing view (`/l/[slug]`) — shows listing content
- [ ] FingerprintJS integration
- [ ] localStorage UUID generation and persistence
- [ ] ToS modal (full-screen, scroll-to-accept, consent stored in Supabase)
- [ ] Deploy edge function: `check-dedup`
- [ ] Dedup check on page load — show/hide application form
- [ ] Application form with all fields
- [ ] Photo upload to Supabase Storage
- [ ] Deploy edge function: `submit-application`
- [ ] Success / already-applied states

### Phase 4 — Dashboard & Reveal (Day 8–9)
- [ ] Applicant dashboard for a listing (`/dashboard/[listingId]`)
- [ ] Anonymous applicant cards (using `applications_masked` view)
- [ ] Status filter tabs (All / New / Shortlisted / Rejected)
- [ ] Stats row (totals by status)
- [ ] Reveal button (UPDATE `is_revealed = true`, confirm dialog)
- [ ] Revealed card with full details and signed photo URL
- [ ] Status update (shortlist / reject)

### Phase 5 — Polish (Day 10–12)
- [ ] Open Graph meta tags for link sharing (listing title + site name)
- [ ] Mobile responsiveness audit (every view)
- [ ] Empty states (no listings, no applicants)
- [ ] Error states (expired listing, listing not found, dedup block)
- [ ] Listing active/inactive toggle (lister can close applications)
- [ ] Optional: Resend email notification when new application arrives
- [ ] Dark mode (if time allows)

### Phase 6 — Deploy & Document
- [ ] Deploy to Vercel with production environment variables
- [ ] Custom domain (crushboard.app or similar)
- [ ] Write README.md (concept, tech stack, architectural decisions)
- [ ] Record a short walkthrough video (lister side + applicant side)
- [ ] Test the full flow on mobile

---

*Last updated: initial spec. Update this file whenever a significant architectural decision changes.*
