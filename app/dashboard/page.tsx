import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox, Plus } from 'lucide-react'

import { getSessionUser, listListings } from '@/lib/server/backend'
import ListingCard from '@/components/listing/ListingCard'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magic/blur-fade'

export const metadata = { title: 'Active positions' }

export default async function DashboardPage() {
  // Belt-and-braces with the layout: redirect() in the layout does not stop
  // this component from executing during the same render cycle.
  const user = await getSessionUser()
  if (!user) redirect('/auth/login')
  const listings = await listListings(user.id)

  return (
    <div className="space-y-8">
      <BlurFade>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Active positions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your open roles and share each application portal.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/create">
              <Plus className="h-4 w-4" />
              Open a new position
            </Link>
          </Button>
        </div>
      </BlurFade>

      {listings.length === 0 ? (
        <BlurFade delay={0.1}>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              No open positions yet. Open a new position to start receiving
              candidates.
            </p>
            <Button asChild className="mt-2">
              <Link href="/dashboard/create">
                <Plus className="h-4 w-4" />
                Open a new position
              </Link>
            </Button>
          </div>
        </BlurFade>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {listings.map((listing, i) => (
            <BlurFade key={listing.id} delay={0.05 * (i + 1)}>
              <ListingCard
                listing={listing}
                applicationCount={listing.application_count}
              />
            </BlurFade>
          ))}
        </div>
      )}
    </div>
  )
}
