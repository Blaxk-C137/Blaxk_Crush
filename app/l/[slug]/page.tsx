import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ListingView from '@/components/listing/ListingView'
import ApplicationFlow from '@/components/application/ApplicationFlow'
import type { Listing } from '@/lib/supabase/types'

export default async function PublicListingPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  // Public read via RLS (USING (true)) — no user scoping needed here.
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!listing) notFound()

  const closed =
    !listing.is_active ||
    (listing.deadline !== null && new Date(listing.deadline) < new Date())

  return (
    <main className="mx-auto max-w-2xl bg-zinc-50 px-4 py-8 sm:py-12">
      <ListingView listing={listing as Listing} />

      {closed ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-zinc-600">
            This position is no longer accepting applications.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <ApplicationFlow listingId={(listing as Listing).id} />
        </div>
      )}
    </main>
  )
}
