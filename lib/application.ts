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

// Anonymous applicant cards show a 120-char excerpt of the bio (spec §12).
export function truncateBio(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}

export function formatAppliedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
