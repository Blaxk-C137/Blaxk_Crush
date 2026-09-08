'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFingerprint } from '@/lib/fingerprint'
import {
  getOrCreateVisitorUUID,
  setTosAccepted,
} from '@/lib/localStorage'

export default function TosModal({ onAccepted }: { onAccepted: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [reachedBottom, setReachedBottom] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setReachedBottom(true)
    }
  }

  // If the terms fit without overflowing (tall viewport), the scroll event
  // never fires — treat that as having read to the bottom.
  useEffect(() => {
    const el = scrollRef.current
    if (el && el.scrollHeight <= el.clientHeight) {
      setReachedBottom(true)
    }
  }, [])

  const handleAccept = async () => {
    setAccepting(true)
    setTosAccepted()
    onAccepted()

    // Best-effort consent record (spec §10): the local flag is the UX gate,
    // the row is the proof. Fire-and-forget — a slow or failed insert must
    // never trap the user in a non-dismissable modal.
    try {
      const [fingerprintHash, visitorUuid] = await Promise.all([
        getFingerprint(),
        Promise.resolve(getOrCreateVisitorUUID()),
      ])
      const supabase = createClient()
      await supabase.from('tos_acceptances').insert({
        fingerprint_hash: fingerprintHash,
        local_storage_uuid: visitorUuid,
      })
    } catch {
      // Consent record failed — acceptance stands locally.
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-900/80 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h1 className="text-lg font-semibold text-zinc-900">
            Terms of Service
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Please read to the bottom and accept to continue.
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <div className="space-y-4 text-sm leading-relaxed text-zinc-600">
            <p>
              Welcome to CrushBoard. By accepting these terms, you agree to the
              following:
            </p>
            <p>
              <strong className="text-zinc-800">1. Entertainment purposes.</strong>{' '}
              This platform is provided for entertainment and social purposes
              only. No guarantee is made of any match, response, or outcome.
            </p>
            <p>
              <strong className="text-zinc-800">2. Age requirement.</strong>{' '}
              You must be at least 18 years old to use this platform or submit
              an application.
            </p>
            <p>
              <strong className="text-zinc-800">3. Data we collect.</strong>{' '}
              We collect an anonymized device identifier (a fingerprint hash)
              and a locally stored identifier to prevent duplicate submissions
              and spam. Application content you submit is stored and may be
              revealed to the listing owner at their discretion.
            </p>
            <p>
              <strong className="text-zinc-800">4. Consent to reveal.</strong>{' '}
              Applications are anonymous to the listing owner until they choose
              to review them. Submitting an application means you consent to
              your details (including any photo and links you provide) being
              shown to the listing owner.
            </p>
            <p>
              <strong className="text-zinc-800">5. Interactions.</strong>{' '}
              CrushBoard is not a party to any interaction that occurs after a
              connection is made, and accepts no liability for such
              interactions. Engage at your own discretion.
            </p>
            <p>
              <strong className="text-zinc-800">6. Data retention.</strong>{' '}
              Submitted applications are retained until deleted by the listing
              owner or until the listing is removed. You may request deletion
              of your data by contacting the listing owner or the site
              operator.
            </p>
            <p>
              <strong className="text-zinc-800">7. Changes.</strong> These
              terms may be updated from time to time; continued use of the
              platform constitutes acceptance of the current version.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!reachedBottom || accepting}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {accepting ? 'Accepting…' : 'I agree to the Terms of Service'}
          </button>
          {!reachedBottom && (
            <p className="mt-2 text-center text-xs text-zinc-400">
              Scroll to the bottom to enable acceptance.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
