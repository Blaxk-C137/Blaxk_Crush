'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ExternalLink,
  Eye,
  EyeOff,
  MapPin,
  Undo2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  revealApplicationAction,
  updateApplicationStatusAction,
} from '@/app/dashboard/actions'
import {
  STATUS_LABELS,
  formatAppliedDate,
  truncateBio,
} from '@/lib/application'
import { initialsAvatarDataUrl } from '@/lib/utils'
import type { ApplicationMasked, ApplicationStatus } from '@/lib/supabase/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STATUS_VARIANT: Record<ApplicationStatus, 'pending' | 'shortlisted' | 'rejected'> = {
  pending: 'pending',
  shortlisted: 'shortlisted',
  rejected: 'rejected',
}

function ApplicantPhoto({
  applicationId,
  name,
}: {
  applicationId: string
  name: string
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/applications/${applicationId}/photo`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) setUrl(data.url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [applicationId])

  const fallback = initialsAvatarDataUrl(name)
  return (
    <Avatar className="h-14 w-14 rounded-lg border">
      <AvatarImage src={url ?? fallback} alt={`${name} — headshot`} />
      <AvatarFallback className="rounded-lg">
        {name.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  )
}

export default function ApplicantCard({
  application,
  listingId,
  number,
}: {
  application: ApplicationMasked
  listingId: string
  number: number
}) {
  const [revealOpen, setRevealOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleReveal = async () => {
    setBusy(true)
    const result = await revealApplicationAction(application.id, listingId)
    setBusy(false)
    setRevealOpen(false)
    if (result.ok) {
      toast.success('Applicant revealed. This cannot be undone.')
    } else {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const setStatus = async (status: ApplicationStatus) => {
    setBusy(true)
    const result = await updateApplicationStatusAction(
      application.id,
      listingId,
      status
    )
    setBusy(false)
    if (result.ok) {
      toast.success(`Application moved to “${STATUS_LABELS[status]}”.`)
    } else {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const revealed = application.is_revealed

  return (
    <>
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {revealed && application.name ? (
              <div className="flex items-center gap-3">
                <ApplicantPhoto
                  applicationId={application.id}
                  name={application.name}
                />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">
                    {application.name}
                    {application.age ? (
                      <span className="text-muted-foreground">
                        , {application.age}
                      </span>
                    ) : null}
                  </h3>
                  {application.applicant_location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {application.applicant_location}
                    </p>
                  )}
                  {application.social_link && (
                    <a
                      href={application.social_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-xs text-brand hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {application.social_link.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <EyeOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Applicant #{number}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Identity sealed until review
                  </p>
                </div>
              </div>
            )}
            <Badge variant={STATUS_VARIANT[application.status]}>
              {STATUS_LABELS[application.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3 pb-4">
          {revealed ? (
            <>
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                {application.bio}
              </blockquote>
              <div className="rounded-md border-l-2 border-muted-foreground/25 bg-muted/40 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Cover letter
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {application.why_apply}
                </p>
              </div>
            </>
          ) : (
            <>
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                “{truncateBio(application.bio)}”
              </blockquote>
              <p className="text-xs italic text-muted-foreground">
                Full application unlocks after review.
              </p>
            </>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Applied: {formatAppliedDate(application.created_at)}
          </p>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 pt-0">
          {!revealed && (
            <Button size="sm" onClick={() => setRevealOpen(true)} disabled={busy}>
              <Eye className="h-3.5 w-3.5" />
              Review application
            </Button>
          )}
          {application.status !== 'shortlisted' && (
            <Button
              size="sm"
              variant={revealed ? 'default' : 'outline'}
              onClick={() => setStatus('shortlisted')}
              disabled={busy}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Shortlist
            </Button>
          )}
          {application.status === 'shortlisted' && (
            <Button size="sm" variant="brand" disabled>
              <UserCheck className="h-3.5 w-3.5" />
              Shortlisted ✓
            </Button>
          )}
          {application.status !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus('rejected')}
              disabled={busy}
            >
              <UserX className="h-3.5 w-3.5" />
              Reject
            </Button>
          )}
          {application.status !== 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStatus('pending')}
              disabled={busy}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Back to review
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review this applicant?</DialogTitle>
            <DialogDescription>
              Revealing unseals this applicant&apos;s full name, photo, age,
              location, and contact link. This is one-way and{' '}
              <span className="font-medium text-foreground">
                cannot be undone
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevealOpen(false)}
              disabled={busy}
            >
              Keep sealed
            </Button>
            <Button onClick={handleReveal} disabled={busy}>
              {busy ? 'Revealing…' : 'Review application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
