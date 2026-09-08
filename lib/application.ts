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
