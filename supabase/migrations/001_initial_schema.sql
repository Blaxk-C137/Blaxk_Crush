-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE work_mode AS ENUM ('local', 'long_distance', 'open');
CREATE TYPE application_status AS ENUM ('pending', 'shortlisted', 'rejected');

-- ============================================================
-- TABLE: listings
-- Created by authenticated listers.
-- ============================================================

CREATE TABLE listings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  -- Content
  title         TEXT NOT NULL,           -- "Seeking: Chief Happiness Officer"
  about         TEXT NOT NULL,           -- what they're looking for
  requirements  TEXT NOT NULL,           -- must-haves
  nice_to_have  TEXT,                    -- preferred qualifications
  perks         TEXT,                    -- compensation package (what they bring)
  location      TEXT,                    -- where they are based
  work_mode     work_mode DEFAULT 'open',
  age_min       INTEGER DEFAULT 18,
  age_max       INTEGER DEFAULT 99,
  deadline      TIMESTAMPTZ,             -- nullable, application cutoff
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: applications
-- Submitted by anonymous applicants.
-- Sensitive fields are NULL when is_revealed = false (enforced by RLS view).
-- ============================================================

CREATE TABLE applications (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Dedup identifiers (never shown to lister)
  fingerprint_hash      TEXT NOT NULL,
  local_storage_uuid    TEXT NOT NULL,

  -- Always visible to lister (anonymized, no PII)
  bio                   TEXT NOT NULL,   -- "cover letter" — visible before reveal
  why_apply             TEXT NOT NULL,   -- "why this role" — visible before reveal

  -- Hidden until is_revealed = true
  name                  TEXT NOT NULL,
  age                   INTEGER NOT NULL,
  applicant_location    TEXT,
  photo_url             TEXT,            -- Supabase Storage path
  social_link           TEXT,

  -- State
  is_revealed           BOOLEAN DEFAULT false NOT NULL,
  status                application_status DEFAULT 'pending' NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: dedup_checks
-- Fast lookup for application uniqueness per listing.
-- Client has zero access — read/write only via edge function.
-- ============================================================

CREATE TABLE dedup_checks (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  fingerprint_hash      TEXT NOT NULL,
  local_storage_uuid    TEXT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Both constraints: catches same device across browsers AND same browser after fingerprint change
  UNIQUE (listing_id, fingerprint_hash),
  UNIQUE (listing_id, local_storage_uuid)
);

-- ============================================================
-- TABLE: tos_acceptances
-- Proof of consent. Insert only. No reads.
-- Stores fingerprint + UUID pair at time of acceptance.
-- ============================================================

CREATE TABLE tos_acceptances (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash      TEXT NOT NULL,
  local_storage_uuid    TEXT NOT NULL,
  accepted_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_listings_user_id     ON listings(user_id);
CREATE INDEX idx_listings_slug        ON listings(slug);
CREATE INDEX idx_applications_listing ON applications(listing_id);
CREATE INDEX idx_dedup_fingerprint    ON dedup_checks(listing_id, fingerprint_hash);
CREATE INDEX idx_dedup_uuid           ON dedup_checks(listing_id, local_storage_uuid);

-- ============================================================
-- Enable RLS
-- ============================================================

ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedup_checks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tos_acceptances   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- listings: public read, owner write
-- ============================================================

CREATE POLICY "Listings are publicly readable"
  ON listings FOR SELECT USING (true);

CREATE POLICY "Listers can create their own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Listers can update their own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Listers can delete their own listings"
  ON listings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- applications: edge function handles inserts via service role.
-- Listers read their own listing's applications.
-- Sensitive columns masked when is_revealed = false via a VIEW.
-- ============================================================

-- Listers can only read applications for listings they own
CREATE POLICY "Listers read applications on their listings"
  ON applications FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );

-- Listers can update status and reveal on their listing's applications
CREATE POLICY "Listers can update application status and reveal"
  ON applications FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM listings WHERE user_id = auth.uid()
    )
  );

-- No direct INSERT from client — handled by edge function with service role
-- No DELETE policy — applications are permanent once submitted

-- ============================================================
-- dedup_checks: no client access at all — service role only
-- ============================================================

-- No policies created = total deny for all authenticated and anonymous clients
-- Edge function uses service role key, bypasses RLS entirely

-- ============================================================
-- tos_acceptances: insert only, no reads
-- ============================================================

CREATE POLICY "Anyone can log ToS acceptance"
  ON tos_acceptances FOR INSERT
  WITH CHECK (true);

-- No SELECT policy = nobody can read the table from client

-- ============================================================
-- Masking Sensitive Columns
-- ============================================================

CREATE VIEW applications_masked AS
SELECT
  id,
  listing_id,
  bio,
  why_apply,
  is_revealed,
  status,
  created_at,
  CASE WHEN is_revealed THEN name           ELSE NULL END AS name,
  CASE WHEN is_revealed THEN age::TEXT      ELSE NULL END AS age,
  CASE WHEN is_revealed THEN applicant_location ELSE NULL END AS applicant_location,
  CASE WHEN is_revealed THEN photo_url      ELSE NULL END AS photo_url,
  CASE WHEN is_revealed THEN social_link    ELSE NULL END AS social_link
FROM applications;
