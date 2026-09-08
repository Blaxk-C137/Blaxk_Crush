-- ============================================================
-- 002: applicant-photos storage bucket + upload policy
-- Photos are uploaded by anonymous applicants from the browser
-- before form submission (spec §11). Bucket is PRIVATE: no
-- public reads; signed URLs are generated in the dashboard
-- (Phase 4) for listing owners only.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('applicant-photos', 'applicant-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Anonymous applicants can upload (INSERT only). No SELECT policy
-- is created, so no client can list or read objects.
CREATE POLICY "Applicants can upload photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'applicant-photos');
