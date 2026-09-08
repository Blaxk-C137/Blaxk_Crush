import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CopyLinkButton from '@/components/listing/CopyLinkButton'
import { buildPortalUrl } from '@/lib/listing'
import { getAppUrl } from '@/lib/utils'

export default async function ListingDashboardPage({
  params,
}: {
  params: { listingId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Scope by user_id: listings are publicly readable via RLS, so the
  // eq('user_id') filter — not the database — is what hides other listers'
  // rows here. A malformed UUID also lands in notFound() (PostgREST error,
  // null data).
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.listingId)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!listing) notFound()

  const portalUrl = buildPortalUrl(getAppUrl(), listing.slug)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {listing.title}
        </h1>
        <Link
          href={`/dashboard/${listing.id}/edit`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Edit position
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Application portal
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <code className="truncate text-sm text-zinc-700">{portalUrl}</code>
          <CopyLinkButton url={portalUrl} />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Share this link — candidates apply directly, no account needed.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Candidates</h2>
        <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-sm text-zinc-600">
            No applications yet. Share your portal link to start receiving
            candidates.
          </p>
        </div>
      </div>
    </div>
  )
}
