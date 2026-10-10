// Hand-written stand-ins for the generated DB types (spec §3 calls for
// `supabase gen types` output here; replace once the CLI project is linked).
// Timestamps arrive from PostgREST as ISO strings; nullable columns are `| null`.

export type WorkMode = "local" | "long_distance" | "open";

export interface Listing {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  about: string;
  requirements: string;
  nice_to_have: string | null;
  perks: string | null;
  location: string | null;
  work_mode: WorkMode;
  age_min: number;
  age_max: number;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
}

export type ApplicationStatus = "pending" | "shortlisted" | "rejected";

// Full row of the applications table. Never exposed to the browser on the
// lister side — listers always receive ApplicationMasked rows.
export interface Application {
  id: string;
  listing_id: string;
  fingerprint_hash: string;
  local_storage_uuid: string;
  bio: string;
  why_apply: string;
  name: string;
  age: number;
  applicant_location: string | null;
  photo_url: string | null;
  social_link: string | null;
  is_revealed: boolean;
  status: ApplicationStatus;
  created_at: string;
}

// One row of the applications_masked view (spec §6). Identity fields are
// NULL until is_revealed; age is TEXT because the view casts age::TEXT.
export interface ApplicationMasked {
  id: string;
  listing_id: string;
  bio: string;
  why_apply: string;
  is_revealed: boolean;
  status: ApplicationStatus;
  created_at: string;
  name: string | null;
  age: string | null;
  applicant_location: string | null;
  photo_url: string | null;
  social_link: string | null;
}

export interface ListingWithCount extends Listing {
  application_count: number;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  shortlisted: number;
  rejected: number;
}

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface ListingPayload {
  title: string;
  about: string;
  requirements: string;
  nice_to_have: string | null;
  perks: string | null;
  location: string | null;
  work_mode: WorkMode;
  age_min: number;
  age_max: number;
  deadline: string | null;
}

export interface ApplicationSubmission {
  listing_id: string;
  fingerprint_hash: string;
  local_storage_uuid: string;
  name: string;
  age: number;
  applicant_location: string | null;
  bio: string;
  why_apply: string;
  photo_url: string | null;
  social_link: string | null;
}
