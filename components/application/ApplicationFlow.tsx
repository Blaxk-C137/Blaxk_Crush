'use client'

import { useEffect, useState } from 'react'
import ApplicationForm from '@/components/application/ApplicationForm'
import { getFingerprint } from '@/lib/fingerprint'
import { getOrCreateVisitorUUID } from '@/lib/localStorage'
import { callEdgeFunction } from '@/lib/edge'

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
      <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm">
        Checking application status…
      </p>
    )
  }

  if (status === 'blocked') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-zinc-600">
          You&apos;ve already submitted an application for this position.
          We&apos;ll be in touch if you progress.
        </p>
      </div>
    )
  }

  if (status === 'submitted') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Application received
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Application received. We&apos;ll review it shortly.
        </p>
      </div>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900">Apply</h2>
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
