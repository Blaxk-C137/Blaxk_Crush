import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing/ListingCard'
import type { Listing } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // eq('user_id') is mandatory — listings are publicly readable via RLS.
  // applications(count) is a PostgREST aggregate: RLS on applications
  // restricts the count to the lister's own listings.
  const { data: listings } = await supabase
    .from('listings')
    .select('*, applications(count)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Active positions
        </h1>
        <Link
          href="/dashboard/create"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Open a new position
        </Link>
      </div>

      {!listings || listings.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-sm text-zinc-600">
            No open positions yet. Open a new position to start receiving
            candidates.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {listings.map(
            (listing: Listing & { applications: { count: number }[] }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                applicationCount={listing.applications?.[0]?.count ?? 0}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
