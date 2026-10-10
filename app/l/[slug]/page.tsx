import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Lock } from 'lucide-react'

import { getListingBySlug } from '@/lib/server/backend'
import { getAppUrl } from '@/lib/utils'
import ApplicationFlow from '@/components/application/ApplicationFlow'
import ListingView from '@/components/listing/ListingView'
import { Wordmark } from '@/components/brand/wordmark'
import { Card, CardContent } from '@/components/ui/card'
import { BlurFade } from '@/components/magic/blur-fade'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const listing = await getListingBySlug(params.slug)
  if (!listing) return { title: 'Position not found' }
  return {
    title: listing.title,
    description:
      listing.about.length > 160
        ? `${listing.about.slice(0, 157)}…`
        : listing.about,
    openGraph: {
      title: `${listing.title} · CrushBoard`,
      description: 'This position is accepting applications on CrushBoard.',
      url: `${getAppUrl()}/l/${listing.slug}`,
      type: 'website',
    },
  }
}

export default async function PublicListingPage({
  params,
}: {
  params: { slug: string }
}) {
  // Public read — listings are public by design (link-only distribution).
  const listing = await getListingBySlug(params.slug)

  if (!listing) notFound()

  const closed =
    !listing.is_active ||
    (listing.deadline !== null && new Date(listing.deadline) < new Date())

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Wordmark />
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Application portal
          </span>
        </div>

        <ListingView listing={listing} />

        <div className="mt-8">
          {closed ? (
            <BlurFade delay={0.1}>
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This position is no longer accepting applications.
                  </p>
                </CardContent>
              </Card>
            </BlurFade>
          ) : (
            <ApplicationFlow listingId={listing.id} />
          )}
        </div>

        <footer className="mt-14 border-t pt-6 text-center text-xs text-muted-foreground">
          Powered by CrushBoard — professional partner acquisition.
        </footer>
      </div>
    </main>
  )
}
