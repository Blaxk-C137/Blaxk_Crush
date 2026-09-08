import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json().catch(() => ({}))
  const {
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
    name,
    age,
    applicant_location,
    bio,
    why_apply,
    photo_url,
    social_link,
  } = body

  const required = [
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
    name,
    age,
    bio,
    why_apply,
  ]
  if (required.some((f) => !f)) {
    return json({ error: 'Missing required fields' }, 400)
  }
  if (!Number.isInteger(age) || age < 18) {
    return json({ error: 'Applicant must be 18 or older' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Closed-listing guard: reject inactive listings and past deadlines.
  const { data: listing } = await supabase
    .from('listings')
    .select('is_active, deadline')
    .eq('id', listing_id)
    .maybeSingle()

  if (!listing) {
    return json({ error: 'Listing not found' }, 404)
  }
  if (!listing.is_active) {
    return json({ error: 'listing_closed' }, 403)
  }
  if (listing.deadline && new Date(listing.deadline) < new Date()) {
    return json({ error: 'listing_closed' }, 403)
  }

  // 1. Re-check dedup server-side (never trust the client check alone)
  const { data: existing } = await supabase
    .from('dedup_checks')
    .select('id')
    .eq('listing_id', listing_id)
    .or(
      `fingerprint_hash.eq.${fingerprint_hash},local_storage_uuid.eq.${local_storage_uuid}`
    )
    .limit(1)
    .maybeSingle()

  if (existing) {
    return json({ error: 'already_applied' }, 409)
  }

  // 2. Insert application
  const { data: application, error: appError } = await supabase
    .from('applications')
    .insert({
      listing_id,
      fingerprint_hash,
      local_storage_uuid,
      name,
      age,
      applicant_location: applicant_location || null,
      bio,
      why_apply,
      photo_url: photo_url || null,
      social_link: social_link || null,
    })
    .select('id')
    .single()

  if (appError) {
    return json({ error: appError.message }, 500)
  }

  // 3. Insert dedup record
  const { error: dedupError } = await supabase.from('dedup_checks').insert({
    listing_id,
    fingerprint_hash,
    local_storage_uuid,
  })

  if (dedupError) {
    // Race with a concurrent submission: the UNIQUE constraints on
    // dedup_checks caught it. The application row inserted in step 2 is
    // the duplicate — remove it to keep one application per person.
    if (dedupError.code === '23505') {
      await supabase.from('applications').delete().eq('id', application.id)
      return json({ error: 'already_applied' }, 409)
    }
    return json({ error: dedupError.message }, 500)
  }

  return json({ success: true, application_id: application.id })
})
