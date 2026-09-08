// Hand-written stand-ins for the generated DB types (spec §3 calls for
// `supabase gen types` output here; replace once the CLI project is linked).
// Timestamps arrive from PostgREST as ISO strings; nullable columns are `| null`.

export type WorkMode = 'local' | 'long_distance' | 'open'

export interface Listing {
  id: string
  user_id: string
  slug: string
  title: string
  about: string
  requirements: string
  nice_to_have: string | null
  perks: string | null
  location: string | null
  work_mode: WorkMode
  age_min: number
  age_max: number
  deadline: string | null
  is_active: boolean
  created_at: string
}
