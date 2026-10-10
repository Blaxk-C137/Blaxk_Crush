import { NextResponse } from 'next/server'
import { checkDedup } from '@/lib/server/backend'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * Demo-mode equivalent of the `check-dedup` Supabase edge function.
 * Identical request/response contract; active only when Supabase is not
 * configured (in Supabase mode the browser calls the edge function itself).
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Use the deployed check-dedup edge function.' },
      { status: 501 }
    )
  }

  const { listing_id, fingerprint_hash, local_storage_uuid } = await request
    .json()
    .catch(() => ({}))

  if (!listing_id || !fingerprint_hash || !local_storage_uuid) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { status, data } = await checkDedup(
    listing_id,
    fingerprint_hash,
    local_storage_uuid
  )
  return NextResponse.json(data, { status })
}
