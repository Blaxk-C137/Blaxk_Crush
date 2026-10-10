import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, DEMO_USER_ID, isSupabaseConfigured } from '@/lib/env'

/**
 * Demo-mode sign in: one click establishes a session as the seeded demo
 * lister (who already has listings and candidates to review).
 * Available only when Supabase is not configured.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin

  if (isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/auth/login`, { status: 303 })
  }

  cookies().set(DEMO_SESSION_COOKIE, DEMO_USER_ID, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // one week
  })

  return NextResponse.redirect(`${origin}/dashboard`, { status: 303 })
}
