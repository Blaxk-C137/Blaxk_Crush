'use server'

import { revalidatePath } from 'next/cache'
import {
  createListing,
  getSessionUser,
  revealApplication,
  setListingActive,
  updateApplicationStatus,
  updateListing,
} from '@/lib/server/backend'
import { toListingPayload, validateListingInput, type ListingFormValues } from '@/lib/listing'
import type { ApplicationStatus } from '@/lib/supabase/types'

export interface ActionResult {
  ok: boolean
  errors?: Record<string, string>
  message?: string
  id?: string
}

async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('unauthorized')
  }
  return user
}

export async function createListingAction(
  values: ListingFormValues
): Promise<ActionResult> {
  const user = await requireUser()

  const errors = validateListingInput(values)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const result = await createListing(user.id, toListingPayload(values))
  if ('error' in result) {
    return { ok: false, message: 'create_failed' }
  }
  revalidatePath('/dashboard')
  return { ok: true, id: result.id }
}

export async function updateListingAction(
  listingId: string,
  values: ListingFormValues
): Promise<ActionResult> {
  const user = await requireUser()

  const errors = validateListingInput(values)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const { error } = await updateListing(user.id, listingId, toListingPayload(values))
  if (error) {
    return { ok: false, message: error === 'not_found' ? 'not_found' : 'save_failed' }
  }
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${listingId}`)
  return { ok: true, id: listingId }
}

export async function setListingActiveAction(
  listingId: string,
  isActive: boolean
): Promise<ActionResult> {
  const user = await requireUser()
  const { error } = await setListingActive(user.id, listingId, isActive)
  if (error) return { ok: false, message: error }
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${listingId}`)
  return { ok: true }
}

/** One-way, permanent reveal (spec §12). */
export async function revealApplicationAction(
  applicationId: string,
  listingId: string
): Promise<ActionResult> {
  const user = await requireUser()
  const { error } = await revealApplication(user.id, applicationId)
  if (error) return { ok: false, message: error }
  revalidatePath(`/dashboard/${listingId}`)
  return { ok: true }
}

export async function updateApplicationStatusAction(
  applicationId: string,
  listingId: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  const user = await requireUser()
  if (!['pending', 'shortlisted', 'rejected'].includes(status)) {
    return { ok: false, message: 'invalid_status' }
  }
  const { error } = await updateApplicationStatus(user.id, applicationId, status)
  if (error) return { ok: false, message: error }
  revalidatePath(`/dashboard/${listingId}`)
  return { ok: true }
}
