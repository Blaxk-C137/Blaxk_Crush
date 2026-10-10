'use client'

import { useEffect, useRef, useState } from 'react'
import { ScrollText } from 'lucide-react'

import { getFingerprint } from '@/lib/fingerprint'
import { getOrCreateVisitorUUID, setTosAccepted } from '@/lib/localStorage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
      await fetch('/api/tos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_hash: fingerprintHash,
          local_storage_uuid: visitorUuid,
        }),
      })
    } catch {
      // Consent record failed — acceptance stands locally.
    }
  }

  return (
    <Dialog open>
      <DialogContent
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            Terms of Service
          </DialogTitle>
          <DialogDescription>
            Please read to the bottom and accept to continue.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Welcome to CrushBoard. By accepting these terms, you agree to the
              following:
            </p>
            <p>
              <strong className="text-foreground">1. Entertainment purposes.</strong>{' '}
              This platform is provided for entertainment and social purposes
              only. No guarantee is made of any match, response, or outcome.
            </p>
            <p>
              <strong className="text-foreground">2. Age requirement.</strong>{' '}
              You must be at least 18 years old to use this platform or submit
              an application.
            </p>
            <p>
              <strong className="text-foreground">3. Data we collect.</strong>{' '}
              We collect an anonymized device identifier (a fingerprint hash)
              and a locally stored identifier to prevent duplicate submissions
              and spam. Application content you submit is stored and may be
              revealed to the listing owner at their discretion.
            </p>
            <p>
              <strong className="text-foreground">4. Consent to reveal.</strong>{' '}
              Applications are anonymous to the listing owner until they choose
              to review them. Submitting an application means you consent to
              your details (including any photo and links you provide) being
              shown to the listing owner.
            </p>
            <p>
              <strong className="text-foreground">5. Interactions.</strong>{' '}
              CrushBoard is not a party to any interaction that occurs after a
              connection is made, and accepts no liability for such
              interactions. Engage at your own discretion.
            </p>
            <p>
              <strong className="text-foreground">6. Data retention.</strong>{' '}
              Submitted applications are retained until deleted by the listing
              owner or until the listing is removed. You may request deletion
              of your data by contacting the listing owner or the site
              operator.
            </p>
            <p>
              <strong className="text-foreground">7. Changes.</strong> These
              terms may be updated from time to time; continued use of the
              platform constitutes acceptance of the current version.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <div className="w-full space-y-2">
            <Button
              type="button"
              onClick={handleAccept}
              disabled={!reachedBottom || accepting}
              className="w-full"
            >
              {accepting ? 'Accepting…' : 'I agree to the Terms of Service'}
            </Button>
            {!reachedBottom && (
              <p className="text-center text-xs text-muted-foreground">
                Scroll to the bottom to enable acceptance.
              </p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
