# CrushBoard Phase 2 — Lister Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in lister create a listing, see it on their dashboard with its shareable portal link, and edit it — all owner-scoped.

**Architecture:** Listing create/edit share one client component (`ListingForm`) that talks to Supabase directly from the browser via the anon-key client; RLS (`auth.uid() = user_id`) is the ownership enforcement. Pages are server components that fetch with the cookie-aware SSR client and **always** scope queries with `.eq('user_id', user.id)` (listings are publicly readable via RLS, so an unscoped query would leak every lister's rows). The portal link (`/l/[slug]`) is computed server-side and copied client-side.

**Tech Stack:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, Supabase (PostgreSQL + RLS), Vitest.

**Spec:** `CLAUDE.md` (project root) — sections 3 (file structure), 5 (schema), 6 (RLS), 8 (Lister Flow steps 3–4), 11 (form fields), 12 (overview design), 13 (design/tone/copy), 15 (Phase 2 roadmap).

## Global Constraints

- Next.js **14** App Router — not 15. TypeScript strict mode on.
- Tailwind utility classes only, no CSS modules. No `src/` directory; import alias `@/*`.
- `SUPABASE_SERVICE_ROLE_KEY` never appears in any file under `app/` or `components/` (spec §4 hard rule). Phase 2 uses only the browser and SSR anon-key clients.
- Design tone (spec §13): professional, neutral palette (slate/zinc/off-white + one accent), Inter font, **no hearts, no pink, no romantic iconography, no bubbly UI**.
- Copy must match spec §13 table verbatim where applicable: "Open a new position" (create CTA), "Active positions" (dashboard heading), "Application portal" (shareable link label), "No applications yet. Share your portal link to start receiving candidates." (empty applicants state).
- All form labels use the corporate recruitment language of spec §11 ("Position Title", "About the Role", "Key Requirements", "Preferred Qualifications", "Compensation Package", "Office Location", "Work Mode", "Application Deadline").
- Work mode label mapping is exact: `local` → "On-site (local only)", `long_distance` → "Remote-friendly", `open` → "Flexible / Open to both".
- Every server-component query against `listings` MUST include `.eq('user_id', user.id)` — the listings SELECT policy is `USING (true)` (public read), so an unscoped query returns everyone's listings.
- Commits go on `main` directly, matching the Phase 1 pattern (one commit per task).
- Deviations from spec, documented up front:
  - Spec §11 says the age range is a "dual range slider". We ship two number inputs ("Minimum age" / "Maximum age") under a "Candidate Profile" group label — no slider dependency, same validation, DB constraint `age_min < age_max` still enforced. Can be upgraded to a slider in Phase 5 polish.
  - Spec §3 lists `lib/supabase/types.ts` as *generated* DB types (`supabase gen types`). Generating requires a linked Supabase CLI project; instead Task 1 hand-writes a `Listing` interface in that file, marked for replacement by generated types later.
  - The portal link `/l/[slug]` is a 404 until Phase 3 builds it. Copying it is still correct — the URL format is final.

---

### Task 1: Listing types + form helpers

**Files:**
- Create: `lib/supabase/types.ts`
- Create: `lib/listing.ts`
- Test: `lib/__tests__/listing.test.ts`

**Interfaces:**
- Consumes: nothing (Phase 1 gave us `lib/utils.ts#getAppUrl(): string`).
- Produces:
  - `Listing` interface (`lib/supabase/types.ts`) — mirrors the `listings` table columns with PostgREST JSON types (timestamps as ISO strings, nullable columns as `| null`).
  - `WorkMode = 'local' | 'long_distance' | 'open'`
  - `WORK_MODE_OPTIONS: ReadonlyArray<{ value: WorkMode; label: string }>`
  - `ListingFormValues` — all-string form state (numbers and dates stay strings while editing).
  - `buildPortalUrl(appUrl: string, slug: string): string`
  - `validateListingInput(values: ListingFormValues): Record<string, string>` — map of field name → error message; empty object means valid.

- [ ] **Step 1: Write the failing tests**

`lib/__tests__/listing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildPortalUrl,
  validateListingInput,
  type ListingFormValues,
} from '../listing'

const valid: ListingFormValues = {
  title: 'Seeking: Chief Happiness Officer',
  about: 'A partner for museum trips and long conversations.',
  requirements: 'Must love dogs. Must tolerate puns.',
  nice_to_have: '',
  perks: '',
  location: '',
  work_mode: 'open',
  age_min: '25',
  age_max: '35',
  deadline: '',
}

describe('validateListingInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateListingInput(valid)).toEqual({})
  })

  it('flags a whitespace-only title', () => {
    expect(validateListingInput({ ...valid, title: '   ' })).toHaveProperty('title')
  })

  it('flags missing about and requirements', () => {
    const errors = validateListingInput({ ...valid, about: '', requirements: '' })
    expect(Object.keys(errors)).toEqual(['about', 'requirements'])
  })

  it('flags an invalid work mode', () => {
    expect(
      validateListingInput({ ...valid, work_mode: 'hybrid' as never })
    ).toHaveProperty('work_mode')
  })

  it('flags a minimum age below 18', () => {
    expect(validateListingInput({ ...valid, age_min: '21', age_max: '35' })).toEqual({})
    expect(validateListingInput({ ...valid, age_min: '17' })).toHaveProperty('age_min')
  })

  it('flags a non-integer age', () => {
    expect(validateListingInput({ ...valid, age_min: '25.5' })).toHaveProperty('age_min')
  })

  it('flags when age_min is not less than age_max', () => {
    expect(validateListingInput({ ...valid, age_min: '35', age_max: '35' })).toHaveProperty(
      'age_max'
    )
    expect(validateListingInput({ ...valid, age_min: '40', age_max: '35' })).toHaveProperty(
      'age_max'
    )
  })

  it('flags an unparseable deadline but accepts a valid one', () => {
    // date inputs produce yyyy-mm-dd; a valid one is fine
    expect(validateListingInput({ ...valid, deadline: '2026-12-01' })).toEqual({})
  })

  it('ignores an empty deadline (optional field)', () => {
    expect(validateListingInput({ ...valid, deadline: '' })).toEqual({})
  })
})

describe('buildPortalUrl', () => {
  it('joins the app url and slug', () => {
    expect(buildPortalUrl('https://crushboard.app', 'abc-123')).toBe(
      'https://crushboard.app/l/abc-123'
    )
  })

  it('strips trailing slashes from the app url', () => {
    expect(buildPortalUrl('http://localhost:3000/', 'abc-123')).toBe(
      'http://localhost:3000/l/abc-123'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../listing`.

- [ ] **Step 3: Implement the types and helpers**

`lib/supabase/types.ts`:

```ts
// Hand-written stand-ins for the generated DB types (spec §3 calls for
// `supabase gen types` output here; replace once the CLI project is linked).
// Timestamps arrive from PostgREST as ISO strings; nullable columns are `| null`.

export type WorkMode = 'local' | 'long_distance' | 'open'

export interface Listing {
  id: string
  user_id: string
  slug: string
  title: string
  about: string
  requirements: string
  nice_to_have: string | null
  perks: string | null
  location: string | null
  work_mode: WorkMode
  age_min: number
  age_max: number
  deadline: string | null
  is_active: boolean
  created_at: string
}
```

`lib/listing.ts`:

```ts
import type { WorkMode } from '@/lib/supabase/types'

// Label mapping from spec §11 — exact strings.
export const WORK_MODE_OPTIONS: ReadonlyArray<{ value: WorkMode; label: string }> = [
  { value: 'local', label: 'On-site (local only)' },
  { value: 'long_distance', label: 'Remote-friendly' },
  { value: 'open', label: 'Flexible / Open to both' },
]

// All-string form state — numbers/dates stay strings while being edited.
export interface ListingFormValues {
  title: string
  about: string
  requirements: string
  nice_to_have: string
  perks: string
  location: string
  work_mode: WorkMode
  age_min: string
  age_max: string
  deadline: string // yyyy-mm-dd from the date input, '' when empty
}

export function buildPortalUrl(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/+$/, '')}/l/${slug}`
}

export function validateListingInput(
  values: ListingFormValues
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!values.title.trim()) errors.title = 'Position title is required.'
  if (!values.about.trim()) errors.about = 'About the role is required.'
  if (!values.requirements.trim())
    errors.requirements = 'Key requirements are required.'

  const validModes = WORK_MODE_OPTIONS.map((o) => o.value)
  if (!validModes.includes(values.work_mode)) {
    errors.work_mode = 'Select a work mode.'
  }

  const min = Number(values.age_min)
  const max = Number(values.age_max)
  if (!Number.isInteger(min) || min < 18) {
    errors.age_min = 'Minimum age must be 18 or older.'
  }
  if (!Number.isInteger(max)) {
    errors.age_max = 'Enter a valid maximum age.'
  }
  if (!errors.age_min && !errors.age_max && min >= max) {
    errors.age_max = 'Maximum age must be greater than minimum age.'
  }

  if (values.deadline && Number.isNaN(new Date(values.deadline).getTime())) {
    errors.deadline = 'Enter a valid date.'
  }

  return errors
}
```

Note: the vitest alias config (`vitest.config.ts` from Phase 1) maps `@` to the project root, so `@/lib/supabase/types` resolves in tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (Phase 1's 2 utils tests + the new listing tests).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/types.ts lib/listing.ts lib/__tests__/listing.test.ts
git commit -m "feat: listing types, work-mode options, form validation helpers"
```

---

### Task 2: UI primitives

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Textarea.tsx`
- Create: `components/ui/Badge.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `Button` — default export, `ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }`, default variant `primary`.
  - `Input` — default export, `InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }`.
  - `Textarea` — default export, `TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }`, default `rows = 4`.
  - `Badge` — default export, `{ tone?: 'active' | 'closed' | 'neutral'; children: React.ReactNode }`, default tone `neutral`.

No unit tests — presentational only, and the project has no React testing library (adding RTL is out of Phase 2 scope). Verification is `npm run build` (type check) plus visual check in Task 4.

- [ ] **Step 1: Create the components**

`components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

const styles: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50',
  secondary:
    'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-50',
}

export default function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
```

`components/ui/Input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react'

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const inputId = props.id ?? props.name
  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-zinc-700"
      >
        {label}
        {props.required && <span className="text-zinc-400"> *</span>}
      </label>
      <input
        id={inputId}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

`components/ui/Textarea.tsx`:

```tsx
import type { TextareaHTMLAttributes } from 'react'

export default function Textarea({
  label,
  error,
  rows = 4,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}) {
  const textareaId = props.id ?? props.name
  return (
    <div>
      <label
        htmlFor={textareaId}
        className="block text-sm font-medium text-zinc-700"
      >
        {label}
        {props.required && <span className="text-zinc-400"> *</span>}
      </label>
      <textarea
        id={textareaId}
        rows={rows}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

`components/ui/Badge.tsx`:

```tsx
import type { ReactNode } from 'react'

type Tone = 'active' | 'closed' | 'neutral'

const tones: Record<Tone, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border-zinc-200 bg-zinc-100 text-zinc-500',
  neutral: 'border-zinc-200 bg-zinc-50 text-zinc-700',
}

export default function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Verify the project still compiles**

Run: `npm run build`
Expected: BUILD SUCCEEDS with no type errors (new files are not yet imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add components/ui
git commit -m "feat(ui): Button, Input, Textarea, Badge primitives"
```

---

### Task 3: ListingForm component (create + edit)

**Files:**
- Create: `components/listing/ListingForm.tsx`

**Interfaces:**
- Consumes:
  - `WORK_MODE_OPTIONS`, `validateListingInput`, `ListingFormValues` from `@/lib/listing` (Task 1)
  - `Listing` from `@/lib/supabase/types` (Task 1)
  - `createClient` from `@/lib/supabase/client` (Phase 1)
  - `Button`, `Input`, `Textarea` from `@/components/ui/*` (Task 2)
- Produces:
  - `ListingForm` — default export, client component. Props: `{ mode: 'create' | 'edit'; listing?: Listing }` (`listing` required when `mode === 'edit'`).
  - Behavior: on create, inserts via browser client with `user_id` from the session, then `router.push('/dashboard/<id>')`. On edit, updates by `listing.id`, then `router.push('/dashboard/<listing.id>')`. RLS enforces ownership server-side.

- [ ] **Step 1: Create the component**

`components/listing/ListingForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  WORK_MODE_OPTIONS,
  validateListingInput,
  type ListingFormValues,
} from '@/lib/listing'
import type { Listing } from '@/lib/supabase/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

const EMPTY_VALUES: ListingFormValues = {
  title: '',
  about: '',
  requirements: '',
  nice_to_have: '',
  perks: '',
  location: '',
  work_mode: 'open',
  age_min: '18',
  age_max: '99',
  deadline: '',
}

function toFormValues(listing: Listing): ListingFormValues {
  return {
    title: listing.title,
    about: listing.about,
    requirements: listing.requirements,
    nice_to_have: listing.nice_to_have ?? '',
    perks: listing.perks ?? '',
    location: listing.location ?? '',
    work_mode: listing.work_mode,
    age_min: String(listing.age_min),
    age_max: String(listing.age_max),
    // TIMESTAMPTZ comes back as an ISO string; the date input wants yyyy-mm-dd.
    deadline: listing.deadline ? listing.deadline.slice(0, 10) : '',
  }
}

type Field = keyof ListingFormValues

export default function ListingForm({
  mode,
  listing,
}: {
  mode: 'create' | 'edit'
  listing?: Listing
}) {
  const router = useRouter()
  const [values, setValues] = useState<ListingFormValues>(
    mode === 'edit' && listing ? toFormValues(listing) : EMPTY_VALUES
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set =
    (field: Field) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setValues((v) => ({ ...v, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateListingInput(values)
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    setSaving(true)
    setSubmitError(null)

    const supabase = createClient()

    const payload = {
      title: values.title.trim(),
      about: values.about.trim(),
      requirements: values.requirements.trim(),
      nice_to_have: values.nice_to_have.trim() || null,
      perks: values.perks.trim() || null,
      location: values.location.trim() || null,
      work_mode: values.work_mode,
      age_min: Number(values.age_min),
      age_max: Number(values.age_max),
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
    }

    if (mode === 'create') {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSubmitError('Your session has expired. Please sign in again.')
        setSaving(false)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single()

      if (error || !data) {
        setSubmitError(
          'Something went wrong creating the position. Please try again.'
        )
        setSaving(false)
        return
      }

      router.push(`/dashboard/${data.id}`)
    } else {
      const { error } = await supabase
        .from('listings')
        .update(payload)
        .eq('id', listing!.id)

      if (error) {
        setSubmitError(
          'Something went wrong saving your changes. Please try again.'
        )
        setSaving(false)
        return
      }

      router.push(`/dashboard/${listing!.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Position Title"
        required
        value={values.title}
        onChange={set('title')}
        placeholder="Seeking: Chief Happiness Officer"
        error={errors.title}
      />

      <Textarea
        label="About the Role"
        required
        value={values.about}
        onChange={set('about')}
        placeholder="What you're looking for in a partner."
        error={errors.about}
      />

      <Textarea
        label="Key Requirements"
        required
        value={values.requirements}
        onChange={set('requirements')}
        placeholder="Your non-negotiables."
        error={errors.requirements}
      />

      <Textarea
        label="Preferred Qualifications"
        value={values.nice_to_have}
        onChange={set('nice_to_have')}
        placeholder="Soft preferences — nice, not required."
      />

      <Textarea
        label="Compensation Package"
        value={values.perks}
        onChange={set('perks')}
        placeholder="What you bring to the role."
      />

      <Input
        label="Office Location"
        value={values.location}
        onChange={set('location')}
        placeholder="Where you're based."
      />

      <div>
        <label
          htmlFor="work_mode"
          className="block text-sm font-medium text-zinc-700"
        >
          Work Mode <span className="text-zinc-400">*</span>
        </label>
        <select
          id="work_mode"
          value={values.work_mode}
          onChange={set('work_mode')}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          {WORK_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.work_mode && (
          <p className="mt-1 text-sm text-red-600">{errors.work_mode}</p>
        )}
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-zinc-700">
          Candidate Profile <span className="text-zinc-400">*</span>
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-4">
          <Input
            label="Minimum age"
            required
            type="number"
            min={18}
            max={98}
            value={values.age_min}
            onChange={set('age_min')}
            error={errors.age_min}
          />
          <Input
            label="Maximum age"
            required
            type="number"
            min={19}
            max={99}
            value={values.age_max}
            onChange={set('age_max')}
            error={errors.age_max}
          />
        </div>
      </fieldset>

      <Input
        label="Application Deadline"
        type="date"
        value={values.deadline}
        onChange={set('deadline')}
        error={errors.deadline}
      />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : mode === 'create' ? 'Open a new position' : 'Save changes'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npm run build`
Expected: BUILD SUCCEEDS (component not yet routed).

- [ ] **Step 3: Commit**

```bash
git add components/listing/ListingForm.tsx
git commit -m "feat(listing): ListingForm create/edit form component"
```

---

### Task 4: Create listing page

**Files:**
- Create: `app/dashboard/create/page.tsx`

**Interfaces:**
- Consumes: `ListingForm` from `@/components/listing/ListingForm` (Task 3); the protected `app/dashboard/layout.tsx` (Phase 1) wraps the route.
- Produces: `GET /dashboard/create` — authenticated listers get the "Open a new position" form; unauthenticated visitors are redirected to `/auth/login` by the layout.

- [ ] **Step 1: Create the page**

`app/dashboard/create/page.tsx`:

```tsx
import ListingForm from '@/components/listing/ListingForm'

export default function CreateListingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Open a new position
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Describe the role and the kind of candidate you&apos;re looking for.
      </p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <ListingForm mode="create" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify routing and protection**

Run: `npm run dev` (background), then:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/create
```

Expected: `307` (layout redirects to `/auth/login` when logged out). Then stop the dev server.

- [ ] **Step 3: Manual verification (user-assisted, needs a real session)**

With the dev server running and the user logged in via their Phase 1 magic-link session: open `http://localhost:3000/dashboard/create`, confirm the form renders with all spec §11 fields and labels, submit the empty form and confirm the three required-field errors appear, then fill it in and submit. The redirect target `/dashboard/<id>` will 404 until Task 5 — acceptable at this step; what matters is that the submit succeeds (row appears in Supabase Table Editor → `listings`, with a generated `slug`) and the URL changes to `/dashboard/<some-uuid>`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/create
git commit -m "feat(dashboard): create listing page"
```

---

### Task 5: Copy button + listing detail page

**Files:**
- Create: `components/listing/CopyLinkButton.tsx`
- Create: `app/dashboard/[listingId]/page.tsx`

**Interfaces:**
- Consumes:
  - `createClient` from `@/lib/supabase/server` (Phase 1)
  - `buildPortalUrl` from `@/lib/listing` (Task 1), `getAppUrl` from `@/lib/utils` (Phase 1)
  - `Listing` from `@/lib/supabase/types` (Task 1)
- Produces:
  - `CopyLinkButton` — default export, client component. Props: `{ url: string }`. Copies via `navigator.clipboard`, shows "Copied" for 2 s.
  - `GET /dashboard/[listingId]` — owner-scoped listing view with the "Application portal" link + copy button and the empty "Candidates" state. Returns 404 for a non-existent UUID, a malformed UUID, or a listing owned by someone else. Phase 4 replaces the placeholder candidates area with the real applicant dashboard.

- [ ] **Step 1: Create CopyLinkButton**

`components/listing/CopyLinkButton.tsx`:

```tsx
'use client'

import { useState } from 'react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (insecure context) — nothing to fall back to.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
    >
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
```

- [ ] **Step 2: Create the listing detail page**

`app/dashboard/[listingId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CopyLinkButton from '@/components/listing/CopyLinkButton'
import { buildPortalUrl } from '@/lib/listing'
import { getAppUrl } from '@/lib/utils'

export default async function ListingDashboardPage({
  params,
}: {
  params: { listingId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Scope by user_id: listings are publicly readable via RLS, so the
  // eq('user_id') filter — not the database — is what hides other listers'
  // rows here. A malformed UUID also lands in notFound() (PostgREST error,
  // null data).
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.listingId)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!listing) notFound()

  const portalUrl = buildPortalUrl(getAppUrl(), listing.slug)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {listing.title}
        </h1>
        <Link
          href={`/dashboard/${listing.id}/edit`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Edit position
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Application portal
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <code className="truncate text-sm text-zinc-700">{portalUrl}</code>
          <CopyLinkButton url={portalUrl} />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Share this link — candidates apply directly, no account needed.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Candidates</h2>
        <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-sm text-zinc-600">
            No applications yet. Share your portal link to start receiving
            candidates.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify routing**

Run: `npm run dev` (background), then (logged out):

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/00000000-0000-0000-0000-000000000000
```

Expected: `307` (layout auth redirect fires before the page). Stop the dev server.

- [ ] **Step 4: Manual verification (user-assisted)**

Logged in, open the `/dashboard/<id>` URL from Task 4's redirect. Confirm: title renders, the portal link shows `<app-url>/l/<slug>`, "Copy link" copies it and flashes "Copied", the empty candidates state shows the spec §13 copy. Also open `/dashboard/<someone-elses-uuid>` (or a random UUID) and confirm a 404.

- [ ] **Step 5: Commit**

```bash
git add components/listing/CopyLinkButton.tsx "app/dashboard/[listingId]"
git commit -m "feat(dashboard): listing detail page with application portal link"
```

---

### Task 6: Dashboard overview with listing cards

**Files:**
- Create: `components/listing/ListingCard.tsx`
- Modify: `app/dashboard/page.tsx` (replace the placeholder body)

**Interfaces:**
- Consumes:
  - `Badge` (Task 2), `CopyLinkButton` (Task 5)
  - `buildPortalUrl` (Task 1), `getAppUrl` (Phase 1), `Listing` (Task 1)
  - `createClient` from `@/lib/supabase/server` (Phase 1)
- Produces:
  - `ListingCard` — default export, server-compatible component. Props: `{ listing: Listing; applicationCount: number }`.
  - `GET /dashboard` — the lister's own listings, newest first, each card showing: title, "Opened <date>", Active/Closed badge, candidate count, the "Application portal" link with copy button, and "View candidates" / "Edit" links. Preserves the existing empty state and adds the "Open a new position" button in the header.

- [ ] **Step 1: Create ListingCard**

`components/listing/ListingCard.tsx`:

```tsx
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import CopyLinkButton from '@/components/listing/CopyLinkButton'
import { buildPortalUrl } from '@/lib/listing'
import { getAppUrl } from '@/lib/utils'
import type { Listing } from '@/lib/supabase/types'

export default function ListingCard({
  listing,
  applicationCount,
}: {
  listing: Listing
  applicationCount: number
}) {
  const portalUrl = buildPortalUrl(getAppUrl(), listing.slug)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-zinc-900">
            {listing.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Opened{' '}
            {new Date(listing.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <Badge tone={listing.is_active ? 'active' : 'closed'}>
          {listing.is_active ? 'Active' : 'Closed'}
        </Badge>
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        {applicationCount} {applicationCount === 1 ? 'candidate' : 'candidates'}
      </p>

      <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Application portal
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <code className="truncate text-xs text-zinc-700">{portalUrl}</code>
          <CopyLinkButton url={portalUrl} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/dashboard/${listing.id}`}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          View candidates
        </Link>
        <Link
          href={`/dashboard/${listing.id}/edit`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the dashboard page body**

`app/dashboard/page.tsx` (full replacement):

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing/ListingCard'
import type { Listing } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // eq('user_id') is mandatory — listings are publicly readable via RLS.
  // applications(count) is a PostgREST aggregate: RLS on applications
  // restricts the count to the lister's own listings.
  const { data: listings } = await supabase
    .from('listings')
    .select('*, applications(count)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Active positions
        </h1>
        <Link
          href="/dashboard/create"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Open a new position
        </Link>
      </div>

      {!listings || listings.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-sm text-zinc-600">
            No open positions yet. Open a new position to start receiving
            candidates.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {listings.map(
            (listing: Listing & { applications: { count: number }[] }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                applicationCount={listing.applications?.[0]?.count ?? 0}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Manual verification (user-assisted)**

Logged in with the listing created in Task 4: `/dashboard` shows "Active positions", the "Open a new position" button, and one card with the correct title, "Opened <today's date>", an "Active" badge, "0 candidates", the portal link with working copy button, and working "View candidates" / "Edit" links. A second lister's account (or clearing the row) shows the empty state.

- [ ] **Step 4: Commit**

```bash
git add components/listing/ListingCard.tsx app/dashboard/page.tsx
git commit -m "feat(dashboard): listing overview with cards, counts, portal links"
```

---

### Task 7: Edit listing page

**Files:**
- Create: `app/dashboard/[listingId]/edit/page.tsx`

**Interfaces:**
- Consumes:
  - `ListingForm` from `@/components/listing/ListingForm` (Task 3, `mode="edit"` + `listing`)
  - `createClient` from `@/lib/supabase/server` (Phase 1)
- Produces: `GET /dashboard/[listingId]/edit` — owner-scoped edit page. 404s for non-existent/malformed/foreign UUIDs (query scoped by `user_id`; RLS UPDATE policy is the second enforcement layer).

- [ ] **Step 1: Create the page**

`app/dashboard/[listingId]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ListingForm from '@/components/listing/ListingForm'
import type { Listing } from '@/lib/supabase/types'

export default async function EditListingPage({
  params,
}: {
  params: { listingId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Same owner-scoping as the detail page: eq('user_id') hides other
  // listers' rows; a malformed UUID lands in notFound() too.
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.listingId)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!listing) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Edit position
      </h1>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <ListingForm mode="edit" listing={listing as Listing} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification (user-assisted)**

From the listing card, click "Edit": the form is pre-filled with the listing's values (including deadline as yyyy-mm-dd and the saved work mode). Change the title and a couple of optional fields, save, confirm the redirect to `/dashboard/<id>` and that the card on `/dashboard` reflects the change. Edit a foreign/random UUID directly in the URL bar and confirm a 404.

- [ ] **Step 3: Run the full test suite and build**

Run: `npm test && npm run build`
Expected: all tests PASS, build SUCCEEDS.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/[listingId]/edit"
git commit -m "feat(dashboard): edit listing page (owner only)"
```

---

## Self-Review

- **Spec coverage (Phase 2 roadmap):** ✅ Listing creation form with all fields (Task 3 + 4 — every spec §11 field is present with its corporate label); insert listing + slug generation (Task 4 — slug comes from the DB default `gen_random_uuid()`); dashboard overview showing listings (Task 6); shareable link display + copy-to-clipboard (Tasks 5 + 6); listing edit page owner-only (Task 7). Deferred by design: active/inactive toggle (roadmap lists it under Phase 5), applicant dashboard content at `/dashboard/[listingId]` (Phase 4 — Task 5's page is the placeholder that Phase 4 replaces), `/l/[slug]` public view (Phase 3).
- **Placeholder scan:** all steps contain complete code; no TBDs.
- **Type consistency:** `ListingFormValues` fields match `EMPTY_VALUES`, `toFormValues`, and `validateListingInput` exactly. `ListingForm` props (`mode`, `listing`) match usage in Tasks 4 and 7. `CopyLinkButton({ url })` and `ListingCard({ listing, applicationCount })` signatures match all call sites. `WORK_MODE_OPTIONS` values match the DB enum. `buildPortalUrl(appUrl, slug)` used with `getAppUrl()` in Tasks 5 and 6.
- **Security:** no service-role usage anywhere; all server queries scoped by `user_id`; ownership double-enforced by RLS on write.
