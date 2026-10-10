import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Pencil } from 'lucide-react'

import {
  getOwnedListing,
  getSessionUser,
  listApplications,
} from '@/lib/server/backend'
import { computeStats } from '@/lib/application'
import { buildPortalUrl, WORK_MODE_OPTIONS } from '@/lib/listing'
import { getAppUrl } from '@/lib/utils'
import ApplicantsSection from '@/components/application/ApplicantsSection'
import CopyLinkButton from '@/components/listing/CopyLinkButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BlurFade } from '@/components/magic/blur-fade'
import { ShineBorder } from '@/components/magic/shine-border'
import { NumberTicker } from '@/components/magic/number-ticker'

export default async function ListingDashboardPage({
  params,
}: {
  params: { listingId: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/auth/login')
  const listing = await getOwnedListing(user.id, params.listingId)

  if (!listing) notFound()

  const applications = (await listApplications(user.id, listing.id)) ?? []
  const stats = computeStats(applications)
  const portalUrl = buildPortalUrl(getAppUrl(), listing.slug)
  const workMode =
    WORK_MODE_OPTIONS.find((o) => o.value === listing.work_mode)?.label ??
    listing.work_mode
  const deadlinePassed =
    listing.deadline !== null && new Date(listing.deadline) < new Date()
  const closed = !listing.is_active

  const statItems: { label: string; value: number }[] = [
    { label: 'Total candidates', value: stats.total },
    { label: 'Under review', value: stats.pending },
    { label: 'Shortlisted', value: stats.shortlisted },
    { label: 'Not a fit', value: stats.rejected },
  ]

  return (
    <div className="space-y-6">
      <BlurFade>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {listing.title}
              </h1>
              <Badge variant={closed ? 'closed' : 'active'}>
                {closed ? 'Closed' : 'Active'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {workMode}
              {listing.location ? ` · ${listing.location}` : ''}
              {deadlinePassed ? ' · Deadline passed' : ''}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/dashboard/${listing.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit position
            </Link>
          </Button>
        </div>
      </BlurFade>

      {(closed || deadlinePassed) && (
        <BlurFade delay={0.05}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {closed
              ? 'This position is closed — candidates currently cannot apply. Reopen it from the positions overview.'
              : 'The application deadline has passed — candidates can no longer apply.'}
          </div>
        </BlurFade>
      )}

      <BlurFade delay={0.1}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statItems.map((s) => (
            <Card key={s.label}>
              <CardContent className="px-5 py-4">
                <div className="text-3xl font-semibold tracking-tight">
                  <NumberTicker value={s.value} />
                </div>
                <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div className="relative rounded-xl">
          <Card className="relative overflow-hidden border-transparent">
            <CardContent className="px-6 py-5">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Application portal
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <code className="truncate text-sm text-foreground/85">
                  {portalUrl}
                </code>
                <CopyLinkButton url={portalUrl} size="default" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Share this link — candidates apply directly, no account needed.
              </p>
            </CardContent>
          </Card>
          <ShineBorder
            shineColor={["#4f46e5", "#a5b4fc", "#0ea5e9"]}
            duration={9}
          />
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="space-y-5">
          <h2 className="text-lg font-semibold tracking-tight">Candidates</h2>
          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
              No applications yet. Share your portal link to start receiving
              candidates.
            </div>
          ) : (
            <ApplicantsSection
              applications={applications}
              listingId={listing.id}
            />
          )}
        </div>
      </BlurFade>
    </div>
  )
}
