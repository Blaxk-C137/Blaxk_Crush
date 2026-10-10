import { NextResponse } from 'next/server'
import { submitApplication } from '@/lib/server/backend'
import { isSupabaseConfigured } from '@/lib/env'
import type { ApplicationSubmission } from '@/lib/supabase/types'

/**
 * Demo-mode equivalent of the `submit-application` Supabase edge function.
 * Mirrors the edge function's validation and status codes exactly
 * (400 / 403 / 404 / 409 / 200).
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Use the deployed submit-application edge function.' },
      { status: 501 }
    )
  }

  const body = await request.json().catch(() => ({}))
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
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!Number.isInteger(age) || age < 18) {
    return NextResponse.json(
      { error: 'Applicant must be 18 or older' },
      { status: 400 }
    )
  }

  const payload: ApplicationSubmission = {
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
    name: String(name).slice(0, 200),
    age,
    applicant_location: applicant_location ? String(applicant_location).slice(0, 200) : null,
    bio: String(bio).slice(0, 5000),
    why_apply: String(why_apply).slice(0, 5000),
    photo_url: photo_url ? String(photo_url) : null,
    social_link: social_link ? String(social_link).slice(0, 500) : null,
  }

  const { status, data } = await submitApplication(payload)
  return NextResponse.json(data, { status })
}
