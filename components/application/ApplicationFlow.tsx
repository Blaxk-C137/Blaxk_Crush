'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, FileCheck2 } from 'lucide-react'

import ApplicationForm from '@/components/application/ApplicationForm'
import { getFingerprint } from '@/lib/fingerprint'
import { getOrCreateVisitorUUID } from '@/lib/localStorage'
import { callEdgeFunction } from '@/lib/edge'
import { BlurFade } from '@/components/magic/blur-fade'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type FlowStatus = 'checking' | 'open' | 'blocked' | 'submitted'

export default function ApplicationFlow({
  listingId,
}: {
  listingId: string
}) {
  const [status, setStatus] = useState<FlowStatus>('checking')
  const [ids, setIds] = useState<{
    fingerprintHash: string
    visitorUuid: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const fingerprintHash = await getFingerprint()
        const visitorUuid = getOrCreateVisitorUUID()
        if (cancelled) return
        setIds({ fingerprintHash, visitorUuid })

        const { data } = await callEdgeFunction<{
          already_applied: boolean
        }>('check-dedup', {
          listing_id: listingId,
          fingerprint_hash: fingerprintHash,
          local_storage_uuid: visitorUuid,
        })

        if (cancelled) return
        setStatus(data.already_applied ? 'blocked' : 'open')
      } catch {
        // Fail open: submit-application re-checks dedup server-side,
        // so a broken check must never block a legitimate applicant.
        if (!cancelled) setStatus('open')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [listingId])

  if (status === 'checking') {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCheck2 className="h-4 w-4" />
            Checking application status…
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    )
  }

  if (status === 'blocked') {
    return (
      <BlurFade>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            You&apos;ve already submitted an application for this position.
            We&apos;ll be in touch if you progress.
          </CardContent>
        </Card>
      </BlurFade>
    )
  }

  if (status === 'submitted') {
    return (
      <BlurFade>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Application received
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Application received. We&apos;ll review it shortly. Your details
              stay anonymous until the hiring manager chooses to review your
              application.
            </p>
          </CardContent>
        </Card>
      </BlurFade>
    )
  }

  return (
    <section className="space-y-4">
      <BlurFade delay={0.1}>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Apply</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your application is anonymous until reviewed. One application per
            person per position.
          </p>
        </div>
      </BlurFade>
      {ids && (
        <ApplicationForm
          listingId={listingId}
          fingerprintHash={ids.fingerprintHash}
          visitorUuid={ids.visitorUuid}
          onSubmitted={() => setStatus('submitted')}
        />
      )}
    </section>
  )
}
