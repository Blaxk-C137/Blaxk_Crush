# CrushBoard Phase 3 — Public Listing & Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An anonymous applicant can open `/l/[slug]`, accept the ToS, and submit one application (with optional photo) — with server-side dedup enforcing one application per person per listing.

**Architecture:** The public page is a server component fetching the listing by slug (public read via RLS); everything applicant-side is client-side: FingerprintJS + localStorage UUID identify the visitor, ToS acceptance is a localStorage flag + best-effort insert into `tos_acceptances`, and dedup + submission go through two Supabase Edge Functions called directly from the browser with the anon key (service role stays inside Supabase). Photos upload straight to a private Supabase Storage bucket before form submission; the stored `photo_url` is the storage path.

**Tech Stack:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, Supabase (PostgreSQL + RLS + Storage + Edge Functions/Deno), FingerprintJS (open-source, no key), Vitest.

**Spec:** `CLAUDE.md` (project root) — sections 3 (file structure), 4 (env), 5 (schema), 7 (edge functions), 8 (Applicant Flow), 9 (dedup mechanism), 10 (ToS flow), 11 (application form fields), 13 (design/tone/copy), 15 (Phase 3 roadmap).

## Global Constraints

- Next.js **14** App Router — not 15. TypeScript strict mode on.
- Tailwind utility classes only, no CSS modules. No `src/` directory; import alias `@/*`.
- `SUPABASE_SERVICE_ROLE_KEY` never appears in any file under `app/` or `components/`, and never in any edge-function **response**. It is read only via `Deno.env.get` inside `supabase/functions/` (Supabase auto-injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into edge functions at runtime — no dashboard secret setup needed).
- Design tone (spec §13): professional, neutral palette (zinc/off-white + one accent), **no hearts, no pink, no romantic iconography, no bubbly UI**. Corporate recruitment copy only.
- Copy must match spec §13 verbatim where quoted: "You've already submitted an application for this position. We'll be in touch if you progress." (already-applied), "Application received. We'll review it shortly." (success).
- Form labels use spec §11 corporate language: "Full Name", "Years of Experience" (age), "Current Location", "About You", "Cover Letter — Why This Role?", "Professional Headshot" (photo), "Portfolio / LinkedIn" (social_link).
- Mobile-first (spec §13): the application form must be fully usable on a phone.
- Commits go on `main` directly, matching the Phase 1/2 pattern.
- Deviations from spec, documented up front:
  - **Spec §9's client snippet fetches `/api/check-dedup`, but §7 defines the edge function endpoints.** Resolution: the browser calls the edge functions directly (`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/<name>`) with `apikey` + `Authorization: Bearer <anon key>` headers. No Next.js API route is created — this preserves §14's rationale (service-role logic stays inside Supabase). CLAUDE.md §9's snippet is updated in Task 1 to match.
  - **`uuid` npm package → `crypto.randomUUID()`** (spec §9 uses `uuidv4`): native in all supported browsers and Node 22 (repo's engine floor); one less dependency.
  - **CORS + OPTIONS handling added to both edge functions** (spec §7's code omits it): the browser calls these cross-origin; without CORS headers the calls fail.
  - **`submit-application` also rejects closed listings** (inactive or past deadline) with `403`: spec §7's code would let an applicant submit to a closed position. The product rule "lister can close applications" (roadmap Phase 5) depends on this guard.
  - **Race window in `submit-application` is accepted** (spec's sequential dedup-check → insert → insert-dedup is not a transaction). A true fix needs a SECURITY DEFINER RPC; deferred — spec §9 explicitly frames dedup as "friction, not a lock", and the 409 path plus UNIQUE constraints cover the common case.
  - **Dedup check fails open**: if `check-dedup` errors or is unreachable, the form is shown anyway — the submit function re-checks server-side, so a broken check never blocks a legitimate applicant.

## Prerequisites (user-assisted, cannot be automated)

- Task 3's migration (storage bucket + upload policy) must be pasted into Supabase Dashboard → SQL Editor → Run.
- Tasks 4–5's edge functions must be deployed. No `supabase` CLI is installed; **dashboard deploy** is the default: Supabase Dashboard → Edge Functions → "New function" → name it exactly `check-dedup` / `submit-application` → replace the boilerplate with the file's contents → Deploy. (Alternative if the user prefers: `npx supabase` CLI + `supabase login` + `supabase functions deploy <name> --project-ref esqoyrrbvuwhpgfukjkh`.)
- FingerprintJS open-source edition needs **no API key**; `NEXT_PUBLIC_FPJS_API_KEY` stays unset.

---

### Task 1: Visitor identity, application validation, and edge-function client helpers

**Files:**
- Create: `lib/localStorage.ts`
- Create: `lib/fingerprint.ts`
- Create: `lib/application.ts`
- Create: `lib/edge.ts`
- Modify: `package.json` (add `@fingerprintjs/fingerprintjs`)
- Modify: `CLAUDE.md` §9 (replace the `/api/check-dedup` fetch snippet)
- Test: `lib/__tests__/localStorage.test.ts`
- Test: `lib/__tests__/application.test.ts`
- Test: `lib/__tests__/edge.test.ts`

**Interfaces:**
- Consumes: nothing new (Phase 2's `lib/` helpers unchanged).
- Produces:
  - `getOrCreateVisitorUUID(): string`, `hasTosAccepted(): boolean`, `setTosAccepted(): void` (`lib/localStorage.ts`) — all touch `window.localStorage`; caller guarantees client-side execution.
  - `getFingerprint(): Promise<string>` (`lib/fingerprint.ts`) — loads FingerprintJS once, caches the `visitorId`.
  - `ApplicationFormValues` (all-string form state), `validateApplicationInput(values): Record<string, string>`, `buildPhotoPath(listingId: string, visitorUuid: string): string` (`lib/application.ts`).
  - `edgeFunctionUrl(name: string): string`, `callEdgeFunction<T>(name: string, body: unknown): Promise<{ status: number; data: T }>` (`lib/edge.ts`).

- [ ] **Step 1: Install the dependency**

```bash
npm install @fingerprintjs/fingerprintjs
```

- [ ] **Step 2: Write the failing tests**

`lib/__tests__/localStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getOrCreateVisitorUUID,
  hasTosAccepted,
  setTosAccepted,
} from '../localStorage'

// Minimal localStorage stub — the module only uses getItem/setItem.
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('localStorage helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStorage())
  })

  it('creates and persists a visitor UUID', () => {
    const first = getOrCreateVisitorUUID()
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(getOrCreateVisitorUUID()).toBe(first) // stable across calls
  })

  it('tracks ToS acceptance with a timestamp flag', () => {
    expect(hasTosAccepted()).toBe(false)
    setTosAccepted()
    expect(hasTosAccepted()).toBe(true)
  })
})
```

`lib/__tests__/application.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  validateApplicationInput,
  buildPhotoPath,
  type ApplicationFormValues,
} from '../application'

const valid: ApplicationFormValues = {
  name: 'Amara Okafor',
  age: '26',
  applicant_location: 'Lagos, Nigeria',
  bio: 'Seven years of experience in spontaneous weekend trips.',
  why_apply: 'I believe I would be a strong fit for this role.',
  social_link: '',
}

describe('validateApplicationInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateApplicationInput(valid)).toEqual({})
  })

  it('flags a whitespace-only name', () => {
    expect(validateApplicationInput({ ...valid, name: '  ' })).toHaveProperty(
      'name'
    )
  })

  it('flags a non-integer or underage age', () => {
    expect(validateApplicationInput({ ...valid, age: '26.5' })).toHaveProperty(
      'age'
    )
    expect(validateApplicationInput({ ...valid, age: '17' })).toHaveProperty(
      'age'
    )
    expect(validateApplicationInput({ ...valid, age: '' })).toHaveProperty('age')
  })

  it('flags missing bio and why_apply', () => {
    const errors = validateApplicationInput({
      ...valid,
      bio: '',
      why_apply: '',
    })
    expect(Object.keys(errors)).toEqual(['bio', 'why_apply'])
  })

  it('accepts an empty social link but rejects a malformed one', () => {
    expect(
      validateApplicationInput({ ...valid, social_link: '' })
    ).toEqual({})
    expect(
      validateApplicationInput({ ...valid, social_link: 'instagram.com/amara' })
    ).toHaveProperty('social_link')
    expect(
      validateApplicationInput({
        ...valid,
        social_link: 'https://instagram.com/amara',
      })
    ).toEqual({})
  })
})

describe('buildPhotoPath', () => {
  it('scopes the path under the listing id and visitor uuid', () => {
    const path = buildPhotoPath(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    )
    expect(path).toMatch(
      /^11111111-1111-1111-1111-111111111111\/22222222-2222-2222-2222-222222222222-\d+$/
    )
  })
})
```

`lib/__tests__/edge.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { edgeFunctionUrl, callEdgeFunction } from '../edge'

describe('edgeFunctionUrl', () => {
  it('builds the function endpoint under the project url', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co')
    expect(edgeFunctionUrl('check-dedup')).toBe(
      'https://proj.supabase.co/functions/v1/check-dedup'
    )
    vi.unstubAllEnvs()
  })
})

describe('callEdgeFunction', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('POSTs the body with anon auth headers and returns status + json', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-123')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ already_applied: true }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await callEdgeFunction<{ already_applied: boolean }>(
      'check-dedup',
      { listing_id: 'abc', fingerprint_hash: 'f', local_storage_uuid: 'u' }
    )

    expect(result).toEqual({
      status: 200,
      data: { already_applied: true },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://proj.supabase.co/functions/v1/check-dedup')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      apikey: 'anon-key-123',
      Authorization: 'Bearer anon-key-123',
    })
    expect(JSON.parse(init.body)).toEqual({
      listing_id: 'abc',
      fingerprint_hash: 'f',
      local_storage_uuid: 'u',
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../localStorage`, `../application`, `../edge`.

- [ ] **Step 4: Implement the modules**

`lib/localStorage.ts`:

```ts
const LS_UUID_KEY = 'cb_visitor_uuid'
const TOS_KEY = 'tos_v1'

export function getOrCreateVisitorUUID(): string {
  let uuid = localStorage.getItem(LS_UUID_KEY)
  if (!uuid) {
    uuid = crypto.randomUUID()
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

`lib/fingerprint.ts` (per spec §9 — browser only; no unit test, type-check via build):

```ts
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

`lib/application.ts`:

```ts
export interface ApplicationFormValues {
  name: string
  age: string
  applicant_location: string
  bio: string
  why_apply: string
  social_link: string
}

export function validateApplicationInput(
  values: ApplicationFormValues
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!values.name.trim()) errors.name = 'Full name is required.'

  const age = Number(values.age)
  if (!Number.isInteger(age) || age < 18) {
    errors.age = 'You must be 18 or older to apply.'
  }

  if (!values.bio.trim()) errors.bio = 'About you is required.'
  if (!values.why_apply.trim())
    errors.why_apply = 'Cover letter is required.'

  if (
    values.social_link.trim() &&
    !/^https?:\/\/.+\..+/.test(values.social_link.trim())
  ) {
    errors.social_link =
      'Enter a valid URL (starting with http:// or https://).'
  }

  return errors
}

export function buildPhotoPath(
  listingId: string,
  visitorUuid: string
): string {
  return `${listingId}/${visitorUuid}-${Date.now()}`
}
```

`lib/edge.ts`:

```ts
export function edgeFunctionUrl(name: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`
}

// POSTs JSON to an edge function with the anon key as both apikey and
// bearer (Supabase's verify_jwt accepts the anon JWT for public functions).
export async function callEdgeFunction<T>(
  name: string,
  body: unknown
): Promise<{ status: number; data: T }> {
  const res = await fetch(edgeFunctionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T
  return { status: res.status, data }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (13 existing + new localStorage/application/edge tests).

- [ ] **Step 6: Update CLAUDE.md §9's dedup-check snippet**

In CLAUDE.md §9, replace the `runDedupCheck` snippet's `fetch('/api/check-dedup', …)` block with a version using `callEdgeFunction('check-dedup', { listing_id, fingerprint_hash, local_storage_uuid })` from `@/lib/edge`, so the doc matches the shipped approach (direct edge-function call, no Next API route).

- [ ] **Step 7: Commit**

```bash
git add lib package.json package-lock.json CLAUDE.md
git commit -m "feat: visitor identity, application validation, edge function client"
```

---

### Task 2: ToS modal and site-wide gate

**Files:**
- Create: `components/tos/TosModal.tsx`
- Create: `components/tos/TosGate.tsx`
- Modify: `app/layout.tsx` (wrap children in `TosGate`)

**Interfaces:**
- Consumes: `hasTosAccepted`, `setTosAccepted`, `getOrCreateVisitorUUID` from `@/lib/localStorage`; `getFingerprint` from `@/lib/fingerprint`; `createClient` from `@/lib/supabase/client`.
- Produces:
  - `TosModal({ onAccepted: () => void })` — default export, client component. Full-screen non-dismissable overlay; accept button enabled only after scroll-to-bottom; on accept sets the local flag, fires the best-effort `tos_acceptances` insert, calls `onAccepted()`.
  - `TosGate({ children })` — default export, client component. Renders children always; overlays `TosModal` when the local flag is absent. Mount-gated to avoid hydration mismatch.

No unit tests (presentational + browser-only); verification is `npm run build` plus a manual browser check deferred to Task 7's user-assisted pass.

- [ ] **Step 1: Create TosModal**

`components/tos/TosModal.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'
import {
  getOrCreateVisitorUUID,
  setTosAccepted,
} from '@/lib/localStorage'

export default function TosModal({ onAccepted }: { onAccepted: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [reachedBottom, setReachedBottom] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setReachedBottom(true)
    }
  }

  const handleAccept = async () => {
    setAccepting(true)
    setTosAccepted()

    // Best-effort consent record (spec §10): the local flag is the UX gate,
    // the row is the proof. A failed insert does not block acceptance.
    try {
      const [fingerprintHash, localStorageUuid] = await Promise.all([
        getFingerprint(),
        Promise.resolve(getOrCreateVisitorUUID()),
      ])
      const supabase = createClient()
      await supabase.from('tos_acceptances').insert({
        fingerprint_hash: fingerprintHash,
        local_storage_uuid: localStorageUuid,
      })
    } catch {
      // Consent record failed — acceptance stands locally.
    }

    onAccepted()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-900/80 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h1 className="text-lg font-semibold text-zinc-900">
            Terms of Service
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Please read to the bottom and accept to continue.
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <div className="space-y-4 text-sm leading-relaxed text-zinc-600">
            <p>
              Welcome to CrushBoard. By accepting these terms, you agree to the
              following:
            </p>
            <p>
              <strong className="text-zinc-800">1. Entertainment purposes.</strong>{' '}
              This platform is provided for entertainment and social purposes
              only. No guarantee is made of any match, response, or outcome.
            </p>
            <p>
              <strong className="text-zinc-800">2. Age requirement.</strong>{' '}
              You must be at least 18 years old to use this platform or submit
              an application.
            </p>
            <p>
              <strong className="text-zinc-800">3. Data we collect.</strong>{' '}
              We collect an anonymized device identifier (a fingerprint hash)
              and a locally stored identifier to prevent duplicate submissions
              and spam. Application content you submit is stored and may be
              revealed to the listing owner at their discretion.
            </p>
            <p>
              <strong className="text-zinc-800">4. Consent to reveal.</strong>{' '}
              Applications are anonymous to the listing owner until they choose
              to review them. Submitting an application means you consent to
              your details (including any photo and links you provide) being
              shown to the listing owner.
            </p>
            <p>
              <strong className="text-zinc-800">5. Interactions.</strong>{' '}
              CrushBoard is not a party to any interaction that occurs after a
              connection is made, and accepts no liability for such
              interactions. Engage at your own discretion.
            </p>
            <p>
              <strong className="text-zinc-800">6. Data retention.</strong>{' '}
              Submitted applications are retained until deleted by the listing
              owner or until the listing is removed. You may request deletion
              of your data by contacting the listing owner or the site
              operator.
            </p>
            <p>
              <strong className="text-zinc-800">7. Changes.</strong> These
              terms may be updated from time to time; continued use of the
              platform constitutes acceptance of the current version.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!reachedBottom || accepting}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {accepting ? 'Accepting…' : 'I agree to the Terms of Service'}
          </button>
          {!reachedBottom && (
            <p className="mt-2 text-center text-xs text-zinc-400">
              Scroll to the bottom to enable acceptance.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TosGate**

`components/tos/TosGate.tsx`:

```tsx
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import TosModal from '@/components/tos/TosModal'
import { hasTosAccepted } from '@/lib/localStorage'

// Mount-gated: localStorage is unavailable during SSR, and rendering the
// modal before mount would flash it at returning visitors (hydration
// mismatch). 'checking' renders children with no overlay.
export default function TosGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'accepted' | 'pending'>(
    'checking'
  )

  useEffect(() => {
    setStatus(hasTosAccepted() ? 'accepted' : 'pending')
  }, [])

  return (
    <>
      {children}
      {status === 'pending' && (
        <TosModal onAccepted={() => setStatus('accepted')} />
      )}
    </>
  )
}
```

- [ ] **Step 3: Wire TosGate into the root layout**

In `app/layout.tsx`, import `TosGate` from `@/components/tos/TosGate` and wrap the `<body>`'s children: the existing `{children}` inside `<body className={...}>` becomes `<TosGate>{children}</TosGate>`. Change nothing else in the layout.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: BUILD SUCCEEDS.

- [ ] **Step 5: Commit**

```bash
git add components/tos app/layout.tsx
git commit -m "feat(tos): full-screen scroll-to-accept modal, site-wide gate"
```

---

### Task 3: Storage bucket + upload policy (migration 002)

**Files:**
- Create: `supabase/migrations/002_applicant_photos_storage.sql`

**Interfaces:**
- Consumes: Supabase Storage internal schema (`storage.buckets`, `storage.objects`).
- Produces: private bucket `applicant-photos` accepting anonymous INSERTs on objects (upload-only; no read policy, so nothing is publicly readable). Signed-URL read policies for listers arrive with Phase 4's dashboard.

- [ ] **Step 1: Write the migration**

`supabase/migrations/002_applicant_photos_storage.sql`:

```sql
-- ============================================================
-- 002: applicant-photos storage bucket + upload policy
-- Photos are uploaded by anonymous applicants from the browser
-- before form submission (spec §11). Bucket is PRIVATE: no
-- public reads; signed URLs are generated in the dashboard
-- (Phase 4) for listing owners only.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('applicant-photos', 'applicant-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Anonymous applicants can upload (INSERT only). No SELECT policy
-- is created, so no client can list or read objects.
CREATE POLICY "Applicants can upload photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'applicant-photos');
```

- [ ] **Step 2: Sanity-check the file**

Run: `grep -c "CREATE POLICY" supabase/migrations/002_applicant_photos_storage.sql`
Expected: `1`.

- [ ] **Step 3: Apply the migration (user-assisted)**

Ask the user to paste the file into Supabase Dashboard → SQL Editor → Run. Verify afterwards via the Storage section of the dashboard: bucket `applicant-photos` exists, marked **Private**.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_applicant_photos_storage.sql
git commit -m "feat(db): private applicant-photos bucket with anon upload policy"
```

---

### Task 4: Edge function — check-dedup

**Files:**
- Create: `supabase/functions/check-dedup/index.ts`

**Interfaces:**
- Consumes: `dedup_checks` table (service-role access, no RLS for clients).
- Produces: `POST /functions/v1/check-dedup` with body `{ listing_id, fingerprint_hash, local_storage_uuid }` → `{ already_applied: boolean }` (200), `{ error }` (400/500). Handles `OPTIONS` for CORS preflight.

- [ ] **Step 1: Write the function**

`supabase/functions/check-dedup/index.ts` (spec §7's function + CORS + method guard):

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { listing_id, fingerprint_hash, local_storage_uuid } =
    await req.json().catch(() => ({}))

  if (!listing_id || !fingerprint_hash || !local_storage_uuid) {
    return json({ error: 'Missing required fields' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('dedup_checks')
    .select('id')
    .eq('listing_id', listing_id)
    .or(
      `fingerprint_hash.eq.${fingerprint_hash},local_storage_uuid.eq.${local_storage_uuid}`
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ already_applied: !!data })
})
```

- [ ] **Step 2: Deploy (user-assisted)**

Supabase Dashboard → Edge Functions → New function → name `check-dedup` → paste the file contents → Deploy. (Or, with the CLI: `npx supabase functions deploy check-dedup --project-ref esqoyrrbvuwhpgfukjkh`.)

- [ ] **Step 3: Verify the deployed function**

Run (substituting the anon key from `.env.local`):

```bash
ANON=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | sed 's/.*=//')
curl -s -w "\nHTTP %{http_code}\n" \
  -X OPTIONS "https://esqoyrrbvuwhpgfukjkh.supabase.co/functions/v1/check-dedup" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "https://esqoyrrbvuwhpgfukjkh.supabase.co/functions/v1/check-dedup" \
  -H "Authorization: Bearer $ANON" -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `200` for OPTIONS; `400` with `{"error":"Missing required fields"}` for the empty POST.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/check-dedup
git commit -m "feat(edge): check-dedup function with CORS"
```

---

### Task 5: Edge function — submit-application

**Files:**
- Create: `supabase/functions/submit-application/index.ts`

**Interfaces:**
- Consumes: `listings` (closed-listing guard), `applications` + `dedup_checks` (service-role writes).
- Produces: `POST /functions/v1/submit-application` with body `{ listing_id, fingerprint_hash, local_storage_uuid, name, age, applicant_location, bio, why_apply, photo_url?, social_link? }` → `{ success: true, application_id }` (200) | `{ error: 'already_applied' }` (409) | `{ error: 'listing_closed' }` (403) | `{ error }` (400/500). Handles `OPTIONS` for CORS.

- [ ] **Step 1: Write the function**

`supabase/functions/submit-application/index.ts` (spec §7's function + CORS + validation + closed-listing guard):

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json().catch(() => ({}))
  const {
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
    name,
    age,
    applicant_location,
    bio,
    why_apply,
    photo_url,
    social_link,
  } = body

  const required = [
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
    name,
    age,
    bio,
    why_apply,
  ]
  if (required.some((f) => !f)) {
    return json({ error: 'Missing required fields' }, 400)
  }
  if (!Number.isInteger(age) || age < 18) {
    return json({ error: 'Applicant must be 18 or older' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Closed-listing guard: reject inactive listings and past deadlines.
  const { data: listing } = await supabase
    .from('listings')
    .select('is_active, deadline')
    .eq('id', listing_id)
    .maybeSingle()

  if (!listing) {
    return json({ error: 'Listing not found' }, 404)
  }
  if (!listing.is_active) {
    return json({ error: 'listing_closed' }, 403)
  }
  if (listing.deadline && new Date(listing.deadline) < new Date()) {
    return json({ error: 'listing_closed' }, 403)
  }

  // 1. Re-check dedup server-side (never trust the client check alone)
  const { data: existing } = await supabase
    .from('dedup_checks')
    .select('id')
    .eq('listing_id', listing_id)
    .or(
      `fingerprint_hash.eq.${fingerprint_hash},local_storage_uuid.eq.${local_storage_uuid}`
    )
    .limit(1)
    .maybeSingle()

  if (existing) {
    return json({ error: 'already_applied' }, 409)
  }

  // 2. Insert application
  const { data: application, error: appError } = await supabase
    .from('applications')
    .insert({
      listing_id,
      fingerprint_hash,
      local_storage_uuid,
      name,
      age,
      applicant_location: applicant_location || null,
      bio,
      why_apply,
      photo_url: photo_url || null,
      social_link: social_link || null,
    })
    .select('id')
    .single()

  if (appError) {
    return json({ error: appError.message }, 500)
  }

  // 3. Insert dedup record
  const { error: dedupError } = await supabase.from('dedup_checks').insert({
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
  })

  if (dedupError) {
    // Race with a concurrent submission: the UNIQUE constraints on
    // dedup_checks caught it. The application row inserted in step 2 is
    // the duplicate — remove it to keep one application per person.
    if (dedupError.code === '23505') {
      await supabase.from('applications').delete().eq('id', application.id)
      return json({ error: 'already_applied' }, 409)
    }
    return json({ error: dedupError.message }, 500)
  }

  return json({ success: true, application_id: application.id })
})
```

- [ ] **Step 2: Deploy (user-assisted)**

Dashboard → Edge Functions → New function → name `submit-application` → paste → Deploy.

- [ ] **Step 3: Verify the deployed function**

```bash
ANON=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | sed 's/.*=//')
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "https://esqoyrrbvuwhpgfukjkh.supabase.co/functions/v1/submit-application" \
  -H "Authorization: Bearer $ANON" -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400` with `{"error":"Missing required fields"}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/submit-application
git commit -m "feat(edge): submit-application function with dedup, closed-listing guard, CORS"
```

---

### Task 6: Public listing page + ListingView

**Files:**
- Create: `app/l/[slug]/page.tsx`
- Create: `components/listing/ListingView.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `Listing`, `WORK_MODE_OPTIONS` from Phase 2; `ApplicationFlow` (Task 7 — this task imports it; **create a stub now and let Task 7 replace it**, or implement Task 7's flow component first if dispatching sequentially — the dispatch order is Task 6 then Task 7, so this task creates a minimal placeholder `components/application/ApplicationFlow.tsx` that Task 7 fully replaces).
- Produces: `GET /l/[slug]` — 404 for unknown slug; listing content for known slugs; closed message ("This position is no longer accepting applications.") when `is_active = false` or the deadline has passed; otherwise renders the application flow.

- [ ] **Step 1: Create the ListingView component**

`components/listing/ListingView.tsx`:

```tsx
import type { Listing } from '@/lib/supabase/types'
import { WORK_MODE_OPTIONS } from '@/lib/listing'

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </h2>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
        {value}
      </p>
    </div>
  )
}

export default function ListingView({ listing }: { listing: Listing }) {
  const workMode =
    WORK_MODE_OPTIONS.find((o) => o.value === listing.work_mode)?.label ??
    listing.work_mode

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Open position
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {listing.title}
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        {workMode}
        {listing.location ? ` · ${listing.location}` : ''}
      </p>

      <div className="mt-6 space-y-6">
        <Section label="About the Role" value={listing.about} />
        <Section label="Key Requirements" value={listing.requirements} />
        {listing.nice_to_have && (
          <Section label="Preferred Qualifications" value={listing.nice_to_have} />
        )}
        {listing.perks && (
          <Section label="Compensation Package" value={listing.perks} />
        )}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Candidate Profile
            </h2>
            <p className="mt-1 text-sm text-zinc-700">
              {listing.age_min}–{listing.age_max}
            </p>
          </div>
          {listing.deadline && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Application Deadline
              </h2>
              <p className="mt-1 text-sm text-zinc-700">
                {new Date(listing.deadline).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Create the placeholder ApplicationFlow**

`components/application/ApplicationFlow.tsx` (Task 7 replaces this file entirely):

```tsx
'use client'

// Placeholder — replaced by Task 7 (dedup check + application form).
export default function ApplicationFlow({ listingId }: { listingId: string }) {
  return (
    <p className="text-sm text-zinc-500" data-listing-id={listingId}>
      Application form loading…
    </p>
  )
}
```

- [ ] **Step 3: Create the public listing page**

`app/l/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ListingView from '@/components/listing/ListingView'
import ApplicationFlow from '@/components/application/ApplicationFlow'
import type { Listing } from '@/lib/supabase/types'

export default async function PublicListingPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  // Public read via RLS (USING (true)) — no user scoping needed here.
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!listing) notFound()

  const closed =
    !listing.is_active ||
    (listing.deadline !== null && new Date(listing.deadline) < new Date())

  return (
    <main className="mx-auto max-w-2xl bg-zinc-50 px-4 py-8 sm:py-12">
      <ListingView listing={listing as Listing} />

      {closed ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-zinc-600">
            This position is no longer accepting applications.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <ApplicationFlow listingId={(listing as Listing).id} />
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Verify routing**

Run: `npm run dev` (background), then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/l/not-a-real-slug"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/"
```

Expected: `404` for the unknown slug; `200` for the landing page (confirms the TosGate wiring from Task 2 didn't break rendering). Stop the dev server. Also run `npm run build` — expect success.

- [ ] **Step 5: Commit**

```bash
git add "app/l" components/listing/ListingView.tsx components/application/ApplicationFlow.tsx
git commit -m "feat(public): listing view at /l/[slug] with closed states"
```

---

### Task 7: Application flow — dedup check, form, photo upload, submit

**Files:**
- Replace: `components/application/ApplicationFlow.tsx` (placeholder from Task 6)
- Create: `components/application/ApplicationForm.tsx`

**Interfaces:**
- Consumes:
  - `getFingerprint` from `@/lib/fingerprint`; `getOrCreateVisitorUUID` from `@/lib/localStorage`
  - `callEdgeFunction` from `@/lib/edge`; `validateApplicationInput`, `buildPhotoPath` from `@/lib/application`
  - `createClient` from `@/lib/supabase/client` (storage upload)
  - `Button`, `Input`, `Textarea` from `@/components/ui`
- Produces:
  - `ApplicationFlow({ listingId: string })` — default export, client component. States: `checking` → `open` | `blocked`; `open` + successful submit → `submitted`. Dedup check fails open.
  - `ApplicationForm({ listingId, fingerprintHash, visitorUuid, onSubmitted })` — default export, client component. Uploads photo (if any) then calls `submit-application`; handles 409 with the spec §13 already-applied copy.

- [ ] **Step 1: Replace ApplicationFlow**

`components/application/ApplicationFlow.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import ApplicationForm from '@/components/application/ApplicationForm'
import { getFingerprint } from '@/lib/fingerprint'
import { getOrCreateVisitorUUID } from '@/lib/localStorage'
import { callEdgeFunction } from '@/lib/edge'

type FlowStatus = 'checking' | 'open' | 'blocked' | 'submitted'

export default function ApplicationFlow({
  listingId,
}: {
  listingId: string
}) {
  const [status, setStatus] = useState<FlowStatus>('checking')
  const [ids, setIds] = useState<{
    fingerprintHash: string
    visitorUuid: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const fingerprintHash = await getFingerprint()
        const visitorUuid = getOrCreateVisitorUUID()
        if (cancelled) return
        setIds({ fingerprintHash, visitorUuid })

        const { data } = await callEdgeFunction<{
          already_applied: boolean
        }>('check-dedup', {
          listing_id: listingId,
          fingerprint_hash: fingerprintHash,
          local_storage_uuid: visitorUuid,
        })

        if (cancelled) return
        setStatus(data.already_applied ? 'blocked' : 'open')
      } catch {
        // Fail open: submit-application re-checks dedup server-side,
        // so a broken check must never block a legitimate applicant.
        if (!cancelled) setStatus('open')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [listingId])

  if (status === 'checking') {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm">
        Checking application status…
      </p>
    )
  }

  if (status === 'blocked') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-zinc-600">
          You&apos;ve already submitted an application for this position.
          We&apos;ll be in touch if you progress.
        </p>
      </div>
    )
  }

  if (status === 'submitted') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Application received
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Application received. We&apos;ll review it shortly.
        </p>
      </div>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900">Apply</h2>
      {ids && (
        <ApplicationForm
          listingId={listingId}
          fingerprintHash={ids.fingerprintHash}
          visitorUuid={ids.visitorUuid}
          onSubmitted={() => setStatus('submitted')}
        />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Create ApplicationForm**

`components/application/ApplicationForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { callEdgeFunction } from '@/lib/edge'
import {
  validateApplicationInput,
  buildPhotoPath,
  type ApplicationFormValues,
} from '@/lib/application'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

const EMPTY_VALUES: ApplicationFormValues = {
  name: '',
  age: '',
  applicant_location: '',
  bio: '',
  why_apply: '',
  social_link: '',
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export default function ApplicationForm({
  listingId,
  fingerprintHash,
  visitorUuid,
  onSubmitted,
}: {
  listingId: string
  fingerprintHash: string
  visitorUuid: string
  onSubmitted: () => void
}) {
  const [values, setValues] = useState<ApplicationFormValues>(EMPTY_VALUES)
  const [photo, setPhoto] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set =
    (field: keyof ApplicationFormValues) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) =>
      setValues((v) => ({ ...v, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateApplicationInput(values)
    if (photo && photo.size > MAX_PHOTO_BYTES) {
      validation.photo = 'Photo must be under 5 MB.'
    }
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    setSubmitting(true)
    setSubmitError(null)

    const supabase = createClient()

    // 1. Upload photo (if provided) — path is the stored photo_url
    let photoUrl: string | null = null
    if (photo) {
      const path = buildPhotoPath(listingId, visitorUuid)
      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from('applicant-photos')
          .upload(path, photo, { cacheControl: '3600', upsert: false })

      if (uploadError || !uploadData) {
        setSubmitError('Photo upload failed. Please try again.')
        setSubmitting(false)
        return
      }
      photoUrl = uploadData.path
    }

    // 2. Submit via edge function (server-side dedup + insert)
    const { status, data } = await callEdgeFunction<{
      success?: boolean
      error?: string
    }>('submit-application', {
      listing_id: listingId,
      fingerprint_hash: fingerprintHash,
      local_storage_uuid: visitorUuid,
      name: values.name.trim(),
      age: Number(values.age),
      applicant_location: values.applicant_location.trim() || null,
      bio: values.bio.trim(),
      why_apply: values.why_apply.trim(),
      photo_url: photoUrl,
      social_link: values.social_link.trim() || null,
    })

    if (status === 200 && data.success) {
      onSubmitted()
      return
    }

    if (status === 409) {
      setSubmitError(
        "You've already submitted an application for this position. We'll be in touch if you progress."
      )
    } else if (status === 403) {
      setSubmitError('This position is no longer accepting applications.')
    } else {
      setSubmitError('Something went wrong submitting your application. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <Input
        label="Full Name"
        name="name"
        required
        value={values.name}
        onChange={set('name')}
        error={errors.name}
        autoComplete="off"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Years of Experience"
          name="age"
          required
          type="number"
          min={18}
          max={99}
          value={values.age}
          onChange={set('age')}
          error={errors.age}
        />
        <Input
          label="Current Location"
          name="applicant_location"
          value={values.applicant_location}
          onChange={set('applicant_location')}
        />
      </div>

      <Textarea
        label="About You"
        name="bio"
        required
        value={values.bio}
        onChange={set('bio')}
        placeholder="Your background, interests, and what you bring to the role."
        error={errors.bio}
      />

      <Textarea
        label="Cover Letter — Why This Role?"
        name="why_apply"
        required
        value={values.why_apply}
        onChange={set('why_apply')}
        placeholder="Tell them why you're the right candidate."
        error={errors.why_apply}
      />

      <Input
        label="Portfolio / LinkedIn"
        name="social_link"
        type="url"
        value={values.social_link}
        onChange={set('social_link')}
        placeholder="https://…"
        error={errors.social_link}
      />

      <div>
        <label
          htmlFor="photo"
          className="block text-sm font-medium text-zinc-700"
        >
          Professional Headshot
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
        />
        <p className="mt-1 text-xs text-zinc-400">
          Optional. Visible to the lister only after they review your
          application.
        </p>
        {errors.photo && (
          <p className="mt-1 text-sm text-red-600">{errors.photo}</p>
        )}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? 'Submitting…' : 'Submit application'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Run the full test suite and build**

Run: `npm test && npm run build`
Expected: all tests PASS, build SUCCEEDS.

- [ ] **Step 4: Commit**

```bash
git add components/application
git commit -m "feat(application): dedup-gated application flow with photo upload"
```

- [ ] **Step 5: User-assisted end-to-end verification (collect for the human)**

With `npm run dev` running, from a fresh browser profile (clean localStorage):
1. Open a portal link (`/l/<slug>` from the dashboard's copy button): ToS modal appears over the page, accept button disabled until scrolled to bottom.
2. Accept: modal disappears, listing content + application form render.
3. Submit the empty form: required-field errors appear (name, age, bio, why_apply).
4. Fill the form, attach a small image, submit: success screen "Application received. We'll review it shortly."
5. Reload the page: "You've already submitted an application for this position. We'll be in touch if you progress."
6. In Supabase Table Editor: `applications` has the row (with photo path), `dedup_checks` has the dedup record, `tos_acceptances` has the consent record; Storage → `applicant-photos` shows the uploaded object.

---

## Self-Review

- **Spec coverage (Phase 3 roadmap):** ✅ Public listing view `/l/[slug]` (Task 6); FingerprintJS integration (Task 1); localStorage UUID (Task 1); ToS modal with scroll-to-accept + Supabase consent (Task 2); `check-dedup` deployed (Task 4); dedup check on page load showing/hiding the form (Task 7's ApplicationFlow); application form with all spec §11 fields (Task 7); photo upload to Storage (Tasks 3 + 7); `submit-application` deployed (Task 5); success/already-applied states (Task 7). OG meta tags and error-state polish are Phase 5 — out of scope.
- **Placeholder scan:** all steps contain complete code; the one intentional placeholder (Task 6's ApplicationFlow stub) is created and replaced within the plan, by design.
- **Type consistency:** `callEdgeFunction(name, body)` used by Tasks 7's flow and form matches `lib/edge.ts`. `ApplicationFormValues` matches `EMPTY_VALUES`, `set()`, and `validateApplicationInput`. `ApplicationFlow({ listingId })` matches Task 6's page usage. `buildPhotoPath(listingId, visitorUuid)` matches the form's call. `TosGate({ children })` matches the layout usage.
- **Security:** service-role key only inside `supabase/functions/` via `Deno.env.get`; anon-key auth headers on client calls; storage bucket private with INSERT-only policy; closed-listing guard server-side.
