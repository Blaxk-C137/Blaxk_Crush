import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import CopyLinkButton from '@/components/listing/CopyLinkButton'
import { buildPortalUrl } from '@/lib/listing'
import { getAppUrl } from '@/lib/utils'
import type { Listing } from '@/lib/supabase/types'

export default function ListingCard({
  listing,
  applicationCount,
}: {
  listing: Listing
  applicationCount: number
}) {
  const portalUrl = buildPortalUrl(getAppUrl(), listing.slug)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-zinc-900">
            {listing.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Opened{' '}
            {new Date(listing.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <Badge tone={listing.is_active ? 'active' : 'closed'}>
          {listing.is_active ? 'Active' : 'Closed'}
        </Badge>
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        {applicationCount} {applicationCount === 1 ? 'candidate' : 'candidates'}
      </p>

      <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Application portal
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <code className="truncate text-xs text-zinc-700">{portalUrl}</code>
          <CopyLinkButton url={portalUrl} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/dashboard/${listing.id}`}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          View candidates
        </Link>
        <Link
          href={`/dashboard/${listing.id}/edit`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
