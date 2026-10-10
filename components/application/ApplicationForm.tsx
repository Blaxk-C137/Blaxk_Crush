'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Send, X } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { callEdgeFunction } from '@/lib/edge'
import { isSupabaseConfigured } from '@/lib/env'
import {
  validateApplicationInput,
  buildPhotoPath,
  type ApplicationFormValues,
} from '@/lib/application'
import { BlurFade } from '@/components/magic/blur-fade'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const EMPTY_VALUES: ApplicationFormValues = {
  name: '',
  age: '',
  applicant_location: '',
  bio: '',
  why_apply: '',
  social_link: '',
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const supabaseMode = isSupabaseConfigured()

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
  const fileRef = useRef<HTMLInputElement>(null)

  const set =
    (field: keyof ApplicationFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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

    // 1. Resolve the stored photo reference (if provided)
    let photoUrl: string | null = null
    if (photo) {
      if (supabaseMode) {
        const supabase = createClient()
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
      } else {
        // Demo mode: keep the headshot as an inline data URL.
        try {
          photoUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error('read_failed'))
            reader.readAsDataURL(photo)
          })
        } catch {
          setSubmitError('Photo upload failed. Please try again.')
          setSubmitting(false)
          return
        }
      }
    }

    // 2. Submit via edge function / local route (server-side dedup + insert)
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
    <BlurFade delay={0.15}>
      <Card>
        <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Full Name"
                htmlFor="name"
                required
                error={errors.name}
                hint="Only shared if your application is reviewed."
              >
                <Input
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={set('name')}
                  autoComplete="off"
                  invalid={!!errors.name}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Years of Experience"
                  htmlFor="age"
                  required
                  error={errors.age}
                >
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min={18}
                    max={99}
                    value={values.age}
                    onChange={set('age')}
                    invalid={!!errors.age}
                  />
                </FormField>
                <FormField
                  label="Current Location"
                  htmlFor="applicant_location"
                  error={errors.applicant_location}
                >
                  <Input
                    id="applicant_location"
                    name="applicant_location"
                    value={values.applicant_location}
                    onChange={set('applicant_location')}
                  />
                </FormField>
              </div>
            </div>

            <Separator />

            <FormField
              label="About You"
              htmlFor="bio"
              required
              error={errors.bio}
              hint="Visible before review — but never attached to your identity."
            >
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                value={values.bio}
                onChange={set('bio')}
                placeholder="Your background, interests, and what you bring to the role."
                invalid={!!errors.bio}
              />
            </FormField>

            <FormField
              label="Cover Letter — Why This Role?"
              htmlFor="why_apply"
              required
              error={errors.why_apply}
            >
              <Textarea
                id="why_apply"
                name="why_apply"
                rows={4}
                value={values.why_apply}
                onChange={set('why_apply')}
                placeholder="Tell them why you're the right candidate."
                invalid={!!errors.why_apply}
              />
            </FormField>

            <Separator />

            <FormField
              label="Portfolio / LinkedIn"
              htmlFor="social_link"
              error={errors.social_link}
            >
              <Input
                id="social_link"
                name="social_link"
                type="url"
                value={values.social_link}
                onChange={set('social_link')}
                placeholder="https://…"
                invalid={!!errors.social_link}
              />
            </FormField>

            <FormField
              label="Professional Headshot"
              error={errors.photo}
              hint="Optional. Visible to the lister only after they review your application."
            >
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  {photo ? 'Change photo' : 'Choose photo'}
                </Button>
                {photo && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {photo.name}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => {
                        setPhoto(null)
                        if (fileRef.current) fileRef.current.value = ''
                      }}
                      className="text-muted-foreground/60 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              <input
                ref={fileRef}
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </FormField>

            {submitError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </BlurFade>
  )
}
