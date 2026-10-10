import { NextResponse } from 'next/server'
import { recordTosAcceptance } from '@/lib/server/backend'

/** Best-effort consent record (spec §10). Always 204 — consent tracking
 *  must never block the user experience. */
export async function POST(request: Request) {
  const { fingerprint_hash, local_storage_uuid } = await request
    .json()
    .catch(() => ({}))
  if (fingerprint_hash && local_storage_uuid) {
    try {
      await recordTosAcceptance(fingerprint_hash, local_storage_uuid)
    } catch {
      // Acceptance stands locally even if the record write fails.
    }
  }
  return new NextResponse(null, { status: 204 })
}
