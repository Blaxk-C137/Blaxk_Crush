import type {
  Application,
  ApplicationMasked,
  ApplicationStats,
  ApplicationStatus,
} from "@/lib/supabase/types";

export interface ApplicationFormValues {
  name: string;
  age: string;
  applicant_location: string;
  bio: string;
  why_apply: string;
  social_link: string;
}

export function validateApplicationInput(
  values: ApplicationFormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) errors.name = "Full name is required.";

  const age = Number(values.age);
  if (!Number.isInteger(age) || age < 18) {
    errors.age = "You must be 18 or older to apply.";
  }

  if (!values.bio.trim()) errors.bio = "About you is required.";
  if (!values.why_apply.trim())
    errors.why_apply = "Cover letter is required.";

  if (
    values.social_link.trim() &&
    !/^https?:\/\/.+\..+/.test(values.social_link.trim())
  ) {
    errors.social_link =
      "Enter a valid URL (starting with http:// or https://).";
  }

  return errors;
}

export function buildPhotoPath(
  listingId: string,
  visitorUuid: string
): string {
  return `${listingId}/${visitorUuid}-${Date.now()}`;
}

// Anonymous applicant cards show a 120-char excerpt of the bio (spec §12).
export function truncateBio(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function formatAppliedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Mirror of the `applications_masked` SQL view (spec §6): identity columns
 * are NULL until the lister reveals the applicant; age is exposed as TEXT.
 * Used by the demo backend so both backends obey the exact same contract.
 */
export function maskApplication(a: Application): ApplicationMasked {
  return {
    id: a.id,
    listing_id: a.listing_id,
    bio: a.bio,
    why_apply: a.why_apply,
    is_revealed: a.is_revealed,
    status: a.status,
    created_at: a.created_at,
    name: a.is_revealed ? a.name : null,
    age: a.is_revealed ? String(a.age) : null,
    applicant_location: a.is_revealed ? a.applicant_location : null,
    photo_url: a.is_revealed ? a.photo_url : null,
    social_link: a.is_revealed ? a.social_link : null,
  };
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Under review",
  shortlisted: "Shortlisted",
  rejected: "Position filled / not a fit",
};

export function computeStats(apps: ApplicationMasked[]): ApplicationStats {
  return apps.reduce<ApplicationStats>(
    (acc, a) => {
      acc.total += 1;
      acc[a.status] += 1;
      return acc;
    },
    { total: 0, pending: 0, shortlisted: 0, rejected: 0 }
  );
}

/** Applicant cards are numbered oldest-first so "#1" is the earliest. */
export function applicantNumber(
  apps: ApplicationMasked[],
  id: string
): number {
  const ordered = [...apps].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  return ordered.findIndex((a) => a.id === id) + 1;
}
