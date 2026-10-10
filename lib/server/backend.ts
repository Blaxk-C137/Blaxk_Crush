/**
 * Server-side backend selector.
 *
 * Returns the Supabase-backed implementation when Supabase env vars are
 * present (production), otherwise the seeded in-memory demo backend
 * (zero-config local evaluation). Both honour the same contracts — including
 * the `applications_masked` masking rules — so the UI never branches.
 */
import "server-only";

import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, DEMO_USER_ID, isSupabaseConfigured } from "@/lib/env";
import { demoBackend } from "@/lib/server/demo-store";
import type {
  ApplicationMasked,
  ApplicationStatus,
  ApplicationSubmission,
  Listing,
  ListingPayload,
  ListingWithCount,
  SessionUser,
} from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    const cookieStore = cookies();
    const session = cookieStore.get(DEMO_SESSION_COOKIE);
    if (!session || session.value !== DEMO_USER_ID) return null;
    return { id: DEMO_USER_ID, email: "demo@crushboard.local" };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function clearDemoSession(): Promise<void> {
  cookies().delete(DEMO_SESSION_COOKIE);
}

/* ------------------------------------------------------------------ */
/* Read operations                                                     */
/* ------------------------------------------------------------------ */

export async function listListings(userId: string): Promise<ListingWithCount[]> {
  if (!isSupabaseConfigured()) return demoBackend.listListings(userId);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  // eq('user_id') is mandatory — listings are publicly readable via RLS.
  const { data, error } = await supabase
    .from("listings")
    .select("*, applications(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (
    data as (Listing & { applications: { count: number }[] })[]
  ).map(({ applications, ...listing }) => ({
    ...listing,
    application_count: applications?.[0]?.count ?? 0,
  }));
}

export async function getOwnedListing(
  userId: string,
  id: string
): Promise<Listing | null> {
  if (!isSupabaseConfigured()) return demoBackend.getOwnedListing(userId, id);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Listing | null) ?? null;
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  if (!isSupabaseConfigured()) return demoBackend.getListingBySlug(slug);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Listing | null) ?? null;
}

/**
 * Reads through the `applications_masked` view — never the raw table —
 * so identity fields are NULL until the lister reveals an applicant.
 * Returns null when the listing does not belong to the user.
 */
export async function listApplications(
  userId: string,
  listingId: string
): Promise<ApplicationMasked[] | null> {
  if (!isSupabaseConfigured()) return demoBackend.listApplications(userId, listingId);

  const owned = await getOwnedListing(userId, listingId);
  if (!owned) return null;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("applications_masked")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true });
  if (error) return null;
  return data as ApplicationMasked[];
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export async function createListing(
  userId: string,
  payload: ListingPayload
): Promise<{ id: string } | { error: string }> {
  if (!isSupabaseConfigured()) return demoBackend.createListing(userId, payload);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "insert_failed" };
  return { id: data.id as string };
}

export async function updateListing(
  userId: string,
  id: string,
  payload: ListingPayload
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return demoBackend.updateListing(userId, id, payload);

  const owned = await getOwnedListing(userId, id);
  if (!owned) return { error: "not_found" };
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { error } = await supabase.from("listings").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function setListingActive(
  userId: string,
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return demoBackend.setListingActive(userId, id, isActive);

  const owned = await getOwnedListing(userId, id);
  if (!owned) return { error: "not_found" };
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { error } = await supabase
    .from("listings")
    .update({ is_active: isActive })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/** One-way reveal (spec §12): flips is_revealed true — never back. */
export async function revealApplication(
  userId: string,
  applicationId: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured())
    return demoBackend.revealApplication(userId, applicationId);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  // RLS scopes this to applications on the caller's own listings.
  const { data, error } = await supabase
    .from("applications")
    .update({ is_revealed: true })
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };
  return { error: null };
}

export async function updateApplicationStatus(
  userId: string,
  applicationId: string,
  status: ApplicationStatus
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured())
    return demoBackend.updateApplicationStatus(userId, applicationId, status);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };
  return { error: null };
}

/**
 * Returns a viewable URL for a revealed applicant's photo.
 * Supabase mode: ownership is verified with the lister's own session (RLS),
 * then a short-lived signed URL is minted with the service role (server-only).
 * Demo mode: the stored value (an inline data URL) is returned directly.
 */
export async function getApplicationPhotoUrl(
  userId: string,
  applicationId: string
): Promise<string | null> {
  if (!isSupabaseConfigured())
    return demoBackend.getApplicationPhotoUrl(userId, applicationId);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, photo_url, is_revealed")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || !app.is_revealed || !app.photo_url) return null;
  if (app.photo_url.startsWith("data:")) return app.photo_url;

  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { data } = await supabaseAdmin.storage
    .from("applicant-photos")
    .createSignedUrl(app.photo_url, 3600);
  return data?.signedUrl ?? null;
}

/* ------------------------------------------------------------------ */
/* Public submission pipeline (demo-only; Supabase mode uses the        */
/* deployed edge functions directly from the browser)                   */
/* ------------------------------------------------------------------ */

export async function checkDedup(
  listingId: string,
  fingerprintHash: string,
  localStorageUuid: string
) {
  return demoBackend.checkDedup(listingId, fingerprintHash, localStorageUuid);
}

export async function submitApplication(payload: ApplicationSubmission) {
  return demoBackend.submitApplication(payload);
}

export async function recordTosAcceptance(
  fingerprintHash: string,
  localStorageUuid: string
): Promise<void> {
  if (!fingerprintHash || !localStorageUuid) return;
  if (!isSupabaseConfigured()) {
    await demoBackend.recordTosAcceptance(fingerprintHash, localStorageUuid);
    return;
  }
  // RLS allows anonymous inserts into tos_acceptances (spec §6).
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  await supabase.from("tos_acceptances").insert({
    fingerprint_hash: fingerprintHash,
    local_storage_uuid: localStorageUuid,
  });
}
