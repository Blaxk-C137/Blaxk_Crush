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
      setSubmitError(
        'Something went wrong submitting your application. Please try again.'
      )
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

      <Button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? 'Submitting…' : 'Submit application'}
      </Button>
    </form>
  )
}
