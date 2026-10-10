import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearDemoSession } from '@/lib/server/backend'
import { isSupabaseConfigured } from '@/lib/env'

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    await supabase.auth.signOut()
  } else {
    await clearDemoSession()
  }
  return NextResponse.redirect(`${new URL(request.url).origin}/`, {
    status: 302,
  })
}
