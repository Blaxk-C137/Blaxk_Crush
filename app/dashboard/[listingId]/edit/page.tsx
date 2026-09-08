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
