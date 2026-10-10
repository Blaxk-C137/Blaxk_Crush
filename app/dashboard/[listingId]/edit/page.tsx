import { notFound, redirect } from 'next/navigation'

import { getOwnedListing, getSessionUser } from '@/lib/server/backend'
import ListingForm from '@/components/listing/ListingForm'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Edit position' }

export default async function EditListingPage({
  params,
}: {
  params: { listingId: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/auth/login')
  const listing = await getOwnedListing(user.id, params.listingId)

  if (!listing) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Edit position
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes apply to your application portal immediately.
        </p>
      </div>
      <Card>
        <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
          <ListingForm mode="edit" listing={listing} />
        </CardContent>
      </Card>
    </div>
  )
}
