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
        name="title"
        required
        value={values.title}
        onChange={set('title')}
        placeholder="Seeking: Chief Happiness Officer"
        error={errors.title}
      />

      <Textarea
        label="About the Role"
        name="about"
        required
        value={values.about}
        onChange={set('about')}
        placeholder="What you're looking for in a partner."
        error={errors.about}
      />

      <Textarea
        label="Key Requirements"
        name="requirements"
        required
        value={values.requirements}
        onChange={set('requirements')}
        placeholder="Your non-negotiables."
        error={errors.requirements}
      />

      <Textarea
        label="Preferred Qualifications"
        name="nice_to_have"
        value={values.nice_to_have}
        onChange={set('nice_to_have')}
        placeholder="Soft preferences — nice, not required."
      />

      <Textarea
        label="Compensation Package"
        name="perks"
        value={values.perks}
        onChange={set('perks')}
        placeholder="What you bring to the role."
      />

      <Input
        label="Office Location"
        name="location"
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
            name="age_min"
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
            name="age_max"
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
        name="deadline"
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
