import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client. Imported exclusively by server code (app/api routes
// and lib/server). The key must never appear in client components.
// Lazily created so importing this module without env vars (demo mode)
// never crashes process startup.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-mode-no-service-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
)
