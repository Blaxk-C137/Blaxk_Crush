'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight, Power, Users } from 'lucide-react'
import { toast } from 'sonner'

import { setListingActiveAction } from '@/app/dashboard/actions'
import { buildPortalUrl } from '@/lib/listing'
import { getAppUrl, cn } from '@/lib/utils'
import type { Listing } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import CopyLinkButton from '@/components/listing/CopyLinkButton'

export default function ListingCard({
  listing,
  applicationCount,
}: {
  listing: Listing
  applicationCount: number
}) {
  const portalUrl = buildPortalUrl(getAppUrl(), listing.slug)
  const [isActive, setIsActive] = useState(listing.is_active)
  const [toggling, setToggling] = useState(false)

  const toggleActive = async () => {
    setToggling(true)
    const next = !isActive
    const result = await setListingActiveAction(listing.id, next)
    if (result.ok) {
      setIsActive(next)
      toast.success(
        next
          ? 'Position reopened — it is accepting applications.'
          : 'Position closed — applications are paused.'
      )
    } else {
      toast.error('Something went wrong. Please try again.')
    }
    setToggling(false)
  }

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/dashboard/${listing.id}`}
              className="group inline-flex max-w-full items-center gap-1"
            >
              <h2 className="truncate text-base font-semibold text-foreground group-hover:underline">
                {listing.title}
              </h2>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Opened{' '}
              {new Date(listing.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleActive}
            disabled={toggling}
            className="shrink-0"
            title={isActive ? 'Close applications' : 'Reopen applications'}
          >
            <Badge
              variant={isActive ? 'active' : 'closed'}
              className={cn('gap-1', toggling && 'opacity-60')}
            >
              <Power className="h-3 w-3" />
              {isActive ? 'Active' : 'Closed'}
            </Badge>
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pb-4">
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-medium text-foreground">{applicationCount}</span>
          {applicationCount === 1 ? 'candidate' : 'candidates'}
        </p>

        <div className="rounded-lg border bg-muted/50 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Application portal
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <code className="truncate text-xs text-foreground/80">
              {portalUrl}
            </code>
            <CopyLinkButton url={portalUrl} />
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button asChild size="sm" className="flex-1">
          <Link href={`/dashboard/${listing.id}`}>View candidates</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/${listing.id}/edit`}>Edit</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
