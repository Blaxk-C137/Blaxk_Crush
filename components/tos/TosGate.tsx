'use client'

import { useEffect, useState, type ReactNode } from 'react'
import TosModal from '@/components/tos/TosModal'
import { hasTosAccepted } from '@/lib/localStorage'

// Mount-gated: localStorage is unavailable during SSR, and rendering the
// modal before mount would flash it at returning visitors (hydration
// mismatch). 'checking' renders children with no overlay.
export default function TosGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'accepted' | 'pending'>(
    'checking'
  )

  useEffect(() => {
    setStatus(hasTosAccepted() ? 'accepted' : 'pending')
  }, [])

  return (
    <>
      {children}
      {status === 'pending' && (
        <TosModal onAccepted={() => setStatus('accepted')} />
      )}
    </>
  )
}
