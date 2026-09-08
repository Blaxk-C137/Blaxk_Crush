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

  const { listing_id, fingerprint_hash, local_storage_uuid } =
    await req.json().catch(() => ({}))

  if (!listing_id || !fingerprint_hash || !local_storage_uuid) {
    return json({ error: 'Missing required fields' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('dedup_checks')
    .select('id')
    .eq('listing_id', listing_id)
    .or(
      `fingerprint_hash.eq.${fingerprint_hash},local_storage_uuid.eq.${local_storage_uuid}`
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ already_applied: !!data }, 200)
})
