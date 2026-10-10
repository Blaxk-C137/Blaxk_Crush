'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createListingAction,
  updateListingAction,
} from '@/app/dashboard/actions'
import {
  WORK_MODE_OPTIONS,
  validateListingInput,
  type ListingFormValues,
} from '@/lib/listing'
import type { Listing, WorkMode } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

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
  const [pending, startTransition] = useTransition()

  const set =
    (field: keyof ListingFormValues) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) =>
      setValues((v) => ({ ...v, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateListingInput(values)
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createListingAction(values)
          : await updateListingAction(listing!.id, values)

      if (!result.ok) {
        if (result.errors) {
          setErrors(result.errors)
          return
        }
        if (result.message === 'unauthorized') {
          toast.error('Your session has expired. Please sign in again.')
        } else {
          toast.error(
            mode === 'create'
              ? 'Something went wrong creating the position. Please try again.'
              : 'Something went wrong saving your changes. Please try again.'
          )
        }
        return
      }

      toast.success(
        mode === 'create'
          ? 'Position opened. Share your application portal link.'
          : 'Changes saved.'
      )
      router.push(`/dashboard/${result.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-5">
        <FormField
          label="Position Title"
          htmlFor="title"
          required
          error={errors.title}
        >
          <Input
            id="title"
            name="title"
            value={values.title}
            onChange={set('title')}
            placeholder="Seeking: Chief Happiness Officer"
            invalid={!!errors.title}
          />
        </FormField>

        <FormField
          label="About the Role"
          htmlFor="about"
          required
          error={errors.about}
        >
          <Textarea
            id="about"
            name="about"
            rows={4}
            value={values.about}
            onChange={set('about')}
            placeholder="What you're looking for in a partner."
            invalid={!!errors.about}
          />
        </FormField>

        <FormField
          label="Key Requirements"
          htmlFor="requirements"
          required
          error={errors.requirements}
        >
          <Textarea
            id="requirements"
            name="requirements"
            rows={4}
            value={values.requirements}
            onChange={set('requirements')}
            placeholder="Your non-negotiables."
            invalid={!!errors.requirements}
          />
        </FormField>

        <FormField
          label="Preferred Qualifications"
          htmlFor="nice_to_have"
          error={errors.nice_to_have}
        >
          <Textarea
            id="nice_to_have"
            name="nice_to_have"
            rows={3}
            value={values.nice_to_have}
            onChange={set('nice_to_have')}
            placeholder="Soft preferences — nice, not required."
          />
        </FormField>

        <FormField
          label="Compensation Package"
          htmlFor="perks"
          error={errors.perks}
        >
          <Textarea
            id="perks"
            name="perks"
            rows={3}
            value={values.perks}
            onChange={set('perks')}
            placeholder="What you bring to the role."
          />
        </FormField>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Office Location"
          htmlFor="location"
          error={errors.location}
        >
          <Input
            id="location"
            name="location"
            value={values.location}
            onChange={set('location')}
            placeholder="Where you're based."
          />
        </FormField>

        <FormField label="Work Mode" required error={errors.work_mode}>
          <Select
            value={values.work_mode}
            onValueChange={(v) =>
              setValues((prev) => ({ ...prev, work_mode: v as WorkMode }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a work mode" />
            </SelectTrigger>
            <SelectContent>
              {WORK_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <fieldset>
        <legend className="text-sm font-medium leading-none">
          Candidate Profile <span className="text-muted-foreground/60">*</span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <FormField
            label="Minimum age"
            htmlFor="age_min"
            error={errors.age_min}
          >
            <Input
              id="age_min"
              name="age_min"
              type="number"
              min={18}
              max={98}
              value={values.age_min}
              onChange={set('age_min')}
              invalid={!!errors.age_min}
            />
          </FormField>
          <FormField
            label="Maximum age"
            htmlFor="age_max"
            error={errors.age_max}
          >
            <Input
              id="age_max"
              name="age_max"
              type="number"
              min={19}
              max={99}
              value={values.age_max}
              onChange={set('age_max')}
              invalid={!!errors.age_max}
            />
          </FormField>
        </div>
      </fieldset>

      <FormField
        label="Application Deadline"
        htmlFor="deadline"
        hint="Optional. Adds urgency to the listing."
        error={errors.deadline}
      >
        <Input
          id="deadline"
          name="deadline"
          type="date"
          value={values.deadline}
          onChange={set('deadline')}
          invalid={!!errors.deadline}
          className="sm:w-56"
        />
      </FormField>

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Open a new position'
              : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
