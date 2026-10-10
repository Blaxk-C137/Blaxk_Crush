import { NextResponse } from 'next/server'
import { getApplicationPhotoUrl, getSessionUser } from '@/lib/server/backend'

/**
 * Returns a short-lived viewable URL for a revealed applicant's photo.
 * Ownership and reveal state are enforced server-side — anonymous,
 * unrevealed, or other listers' photos are never served (spec §11).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = await getApplicationPhotoUrl(user.id, params.id)
  if (!url) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(
    { url },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
