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
