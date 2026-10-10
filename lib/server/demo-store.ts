/**
 * Demo backend — zero-config, in-memory data store seeded with realistic
 * content so every flow (listing, applying, dedup, reveal, status changes)
 * is fully exercisable without a Supabase project.
 *
 * The store lives on globalThis so it survives Next.js dev HMR. All reads of
 * applicant data pass through `maskApplication`, the exact mirror of the
 * `applications_masked` SQL view — the demo backend cannot leak identity
 * fields any more than the production one can.
 */
import "server-only";

import { DEMO_USER_ID } from "@/lib/env";
import { maskApplication } from "@/lib/application";
import { initialsAvatarDataUrl } from "@/lib/utils";
import type {
  Application,
  ApplicationMasked,
  ApplicationStatus,
  ApplicationSubmission,
  Listing,
  ListingPayload,
  ListingWithCount,
} from "@/lib/supabase/types";

interface DedupRow {
  listing_id: string;
  fingerprint_hash: string;
  local_storage_uuid: string;
}

interface DemoStore {
  listings: Listing[];
  applications: Application[];
  dedup: DedupRow[];
  tos: { fingerprint_hash: string; local_storage_uuid: string }[];
}

function daysAgo(n: number, hour = 10): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  d.setUTCHours(hour, 12, 0, 0);
  return d.toISOString();
}

function daysAhead(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

function seed(): DemoStore {
  const listing1: Listing = {
    id: "d3a0c011-0000-4000-8000-000000000101",
    user_id: DEMO_USER_ID,
    slug: "8f3a2c1e-9d4b-4e7a-a6c5-1b2d3e4f5a6b",
    title: "Seeking: Chief Happiness Officer",
    about:
      "An established household of one is recruiting a long-term partner for shared operations: Sunday markets, museum afternoons, and the occasional ambitious dinner party. The successful candidate will report directly to me and, occasionally, to my mother.",
    requirements:
      "• Must love dogs (one medium-sized resident dog has veto power)\n• Fluency in both planning ahead and spontaneous road trips\n• Can hold a conversation with an aunt at a wedding\n• Takes coffee seriously, or is willing to learn",
    nice_to_have:
      "Plays an instrument, knows a second language, or brings an established board-game collection to the merger.",
    perks:
      "Competitive package including: excellent playlists, a library of overly annotated novels, homemade jollof rice on request, and enthusiastic attendance at all your work events.",
    location: "Lagos, NG",
    work_mode: "open",
    age_min: 24,
    age_max: 34,
    deadline: null,
    is_active: true,
    created_at: daysAgo(12),
  };

  const listing2: Listing = {
    id: "d3a0c011-0000-4000-8000-000000000102",
    user_id: DEMO_USER_ID,
    slug: "b2c4d6e8-1a3f-4b5c-8d9e-0f1a2b3c4d5e",
    title: "Now Hiring: Vice President of Weekend Operations",
    about:
      "Weekend operations at this organisation are currently under-resourced. Seeking a deputy for brunch negotiations, bookstore raids, and long walks with no destination. Full-time commitment preferred; contract negotiable.",
    requirements:
      "• Two years minimum of strong opinions about breakfast\n• Ability to assemble furniture without a fight\n• Willingness to relocate — emotionally — for good films",
    nice_to_have: "Has a checklist habit. Owns a decent umbrella.",
    perks:
      "Pension plan of inside jokes. Generous leave allowance for your friends' weddings. All major holidays observed, with catering.",
    location: "Abuja, FCT",
    work_mode: "long_distance",
    age_min: 26,
    age_max: 38,
    deadline: daysAhead(21),
    is_active: true,
    created_at: daysAgo(5),
  };

  const listing3: Listing = {
    id: "d3a0c011-0000-4000-8000-000000000103",
    user_id: DEMO_USER_ID,
    slug: "c5d7e9f1-2b4a-4c6d-8e0f-1a2b3c4d5e6f",
    title: "Position Filled: Director of Shared Playlists",
    about:
      "This role governed auxiliary duties: playlist curation, meme distribution, and quality assurance of takeout orders.",
    requirements: "• Excellent USB-DJ etiquette\n• No skipping tracks",
    nice_to_have: null,
    perks: null,
    location: "Remote",
    work_mode: "local",
    age_min: 25,
    age_max: 40,
    deadline: null,
    is_active: false,
    created_at: daysAgo(40),
  };

  const mk = (
    partial: Omit<
      Application,
      "id" | "listing_id" | "fingerprint_hash" | "local_storage_uuid"
    > & { id: string; listing_id: string }
  ): Application => ({
    fingerprint_hash: `fp_${partial.id.slice(0, 8)}`,
    local_storage_uuid: `uuid_${partial.id.slice(0, 8)}`,
    ...partial,
  });

  const L1 = listing1.id;
  const L2 = listing2.id;

  const amaraName = "Amara Okafor";
  const tundeName = "Tunde Bakare";
  const zainabName = "Zainab Bello";

  const applications: Application[] = [
    mk({
      id: "d3a0c021-0000-4000-8000-000000000201",
      listing_id: L1,
      bio: "Strategy consultant by day, amateur pastry chef by weekend. I run a small book club of four (we actually read the books) and I have never once lost at charades.",
      why_apply:
        "Your requirements around dogs and weddings feel personally targeted at my skill set. I once survived a four-hour reception seated next to a bride's uncle and left with a chess rematch invitation. I believe I would be a strong fit for this role.",
      name: amaraName,
      age: 26,
      applicant_location: "Lagos, Nigeria",
      photo_url: initialsAvatarDataUrl(amaraName),
      social_link: "https://instagram.com/amara.ok",
      is_revealed: true,
      status: "shortlisted",
      created_at: daysAgo(9, 9),
    }),
    mk({
      id: "d3a0c021-0000-4000-8000-000000000202",
      listing_id: L1,
      bio: "Product designer who treats brunch menus like user journeys. Seven years of experience in spontaneous weekend trips; two dogs' worth of dog-sitting references available on request.",
      why_apply:
        "I bring seven years of operational excellence in spontaneous travel, a proven record of zero cases lost in airport roulette, and a deep alignment with your dog-first policy. My references include a very good boy named Simba.",
      name: tundeName,
      age: 29,
      applicant_location: "Abuja, FCT",
      photo_url: initialsAvatarDataUrl(tundeName),
      social_link: "https://linkedin.com/in/tunde-bakare",
      is_revealed: true,
      status: "pending",
      created_at: daysAgo(6, 14),
    }),
    mk({
      id: "d3a0c021-0000-4000-8000-000000000203",
      listing_id: L1,
      bio: "Pediatric nurse. Excellent under pressure, certified in difficult conversations, and fluent in reassuring anxious people at 3 a.m. Weekend availability is strong.",
      why_apply:
        "The role's emphasis on long conversations and museum afternoons matches my current development goals. I am prepared to demonstrate coffee commitment immediately.",
      name: zainabName,
      age: 27,
      applicant_location: "Kaduna, NG",
      photo_url: null,
      social_link: null,
      is_revealed: false,
      status: "pending",
      created_at: daysAgo(4, 18),
    }),
    mk({
      id: "d3a0c021-0000-4000-8000-000000000204",
      listing_id: L1,
      bio: "Civil engineer building bridges by day and arguments for why one season of a great show beats five seasons of a good one by night.",
      why_apply:
        "Your compensation package mentions annotated novels — I annotate in pencil, never pen, which I believe shows the judgment this role demands.",
      name: "Chidi Nwosu",
      age: 31,
      applicant_location: "Enugu, NG",
      photo_url: null,
      social_link: null,
      is_revealed: false,
      status: "pending",
      created_at: daysAgo(2, 8),
    }),
    mk({
      id: "d3a0c021-0000-4000-8000-000000000205",
      listing_id: L1,
      bio: "Food photographer. Can guarantee that every meal you cook looks like a campaign shoot, even the burnt ones (artistic blur).",
      why_apply:
        "I read your required qualifications and passed every audit except dogs — I have only liked dogs so far, but I am committed to full professional development in this area.",
      name: "Funke Adeyemi",
      age: 25,
      applicant_location: "Ibadan, NG",
      photo_url: null,
      social_link: "https://instagram.com/funke.shoots",
      is_revealed: false,
      status: "rejected",
      created_at: daysAgo(11, 16),
    }),
    mk({
      id: "d3a0c021-0000-4000-8000-000000000206",
      listing_id: L2,
      bio: "Data analyst with strong opinions about breakfast (toast is a vehicle, not a meal) and a documented 96% success rate assembling flat-pack furniture on the first attempt.",
      why_apply:
        "Weekend operations require exactly my core competencies: brunch logistics, itinerary improvisation, and owning a decent umbrella.",
      name: "Ibrahim Danjuma",
      age: 30,
      applicant_location: "Kano, NG",
      photo_url: null,
      social_link: null,
      is_revealed: false,
      status: "pending",
      created_at: daysAgo(1, 11),
    }),
    mk({
      id: "d3a0c021-0000-4000-8000-000000000207",
      listing_id: L2,
      bio: "Architect. I bring scale rulers to restaurants to judge menu typography. I have strong breakfast opinions that have survived three housemates.",
      why_apply:
        "The two-year breakfast-opinion requirement was clearly written about me. I also own two umbrellas (redundancy planning).",
      name: "Ngozi Eze",
      age: 28,
      applicant_location: "Port Harcourt, NG",
      photo_url: null,
      social_link: null,
      is_revealed: false,
      status: "pending",
      created_at: daysAgo(0, 9),
    }),
  ];

  return { listings: [listing1, listing2, listing3], applications, dedup: [], tos: [] };
}

const globalForDemo = globalThis as unknown as { __crushDemoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__crushDemoStore) {
    globalForDemo.__crushDemoStore = seed();
  }
  return globalForDemo.__crushDemoStore;
}

function uuid(): string {
  return crypto.randomUUID();
}

export const demoBackend = {
  async listListings(userId: string): Promise<ListingWithCount[]> {
    const s = getDemoStore();
    return s.listings
      .filter((l) => l.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((l) => ({
        ...l,
        application_count: s.applications.filter((a) => a.listing_id === l.id).length,
      }));
  },

  async getOwnedListing(userId: string, id: string): Promise<Listing | null> {
    const s = getDemoStore();
    return s.listings.find((l) => l.id === id && l.user_id === userId) ?? null;
  },

  async getListingBySlug(slug: string): Promise<Listing | null> {
    const s = getDemoStore();
    return s.listings.find((l) => l.slug === slug) ?? null;
  },

  async createListing(userId: string, p: ListingPayload): Promise<{ id: string }> {
    const s = getDemoStore();
    const listing: Listing = {
      id: uuid(),
      user_id: userId,
      slug: uuid(),
      ...p,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    s.listings.unshift(listing);
    return { id: listing.id };
  },

  async updateListing(
    userId: string,
    id: string,
    p: ListingPayload
  ): Promise<{ error: string | null }> {
    const s = getDemoStore();
    const l = s.listings.find((x) => x.id === id && x.user_id === userId);
    if (!l) return { error: "not_found" };
    Object.assign(l, p);
    return { error: null };
  },

  async setListingActive(
    userId: string,
    id: string,
    isActive: boolean
  ): Promise<{ error: string | null }> {
    const s = getDemoStore();
    const l = s.listings.find((x) => x.id === id && x.user_id === userId);
    if (!l) return { error: "not_found" };
    l.is_active = isActive;
    return { error: null };
  },

  async listApplications(
    userId: string,
    listingId: string
  ): Promise<ApplicationMasked[] | null> {
    const s = getDemoStore();
    const owned = s.listings.some((l) => l.id === listingId && l.user_id === userId);
    if (!owned) return null;
    return s.applications
      .filter((a) => a.listing_id === listingId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(maskApplication);
  },

  async revealApplication(
    userId: string,
    applicationId: string
  ): Promise<{ error: string | null }> {
    const s = getDemoStore();
    const app = s.applications.find((a) => a.id === applicationId);
    if (!app) return { error: "not_found" };
    const owned = s.listings.some((l) => l.id === app.listing_id && l.user_id === userId);
    if (!owned) return { error: "forbidden" };
    app.is_revealed = true;
    return { error: null };
  },

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: ApplicationStatus
  ): Promise<{ error: string | null }> {
    const s = getDemoStore();
    const app = s.applications.find((a) => a.id === applicationId);
    if (!app) return { error: "not_found" };
    const owned = s.listings.some((l) => l.id === app.listing_id && l.user_id === userId);
    if (!owned) return { error: "forbidden" };
    app.status = status;
    return { error: null };
  },

  async getApplicationPhotoUrl(
    userId: string,
    applicationId: string
  ): Promise<string | null> {
    const s = getDemoStore();
    const app = s.applications.find((a) => a.id === applicationId);
    if (!app || !app.is_revealed || !app.photo_url) return null;
    const owned = s.listings.some((l) => l.id === app.listing_id && l.user_id === userId);
    if (!owned) return null;
    return app.photo_url;
  },

  async checkDedup(
    listingId: string,
    fingerprintHash: string,
    localStorageUuid: string
  ): Promise<{ status: number; data: { already_applied?: boolean; error?: string } }> {
    const s = getDemoStore();
    const listing = s.listings.find((l) => l.id === listingId);
    if (!listing) return { status: 404, data: { error: "listing_not_found" } };
    const hit = s.dedup.some(
      (d) =>
        d.listing_id === listingId &&
        (d.fingerprint_hash === fingerprintHash ||
          d.local_storage_uuid === localStorageUuid)
    );
    return { status: 200, data: { already_applied: hit } };
  },

  async submitApplication(
    p: ApplicationSubmission
  ): Promise<{ status: number; data: { success?: boolean; application_id?: string; error?: string } }> {
    const s = getDemoStore();
    const listing = s.listings.find((l) => l.id === p.listing_id);
    if (!listing) return { status: 404, data: { error: "listing_not_found" } };
    if (!listing.is_active) return { status: 403, data: { error: "listing_closed" } };
    if (listing.deadline && new Date(listing.deadline) < new Date()) {
      return { status: 403, data: { error: "listing_closed" } };
    }
    const dup = s.dedup.some(
      (d) =>
        d.listing_id === p.listing_id &&
        (d.fingerprint_hash === p.fingerprint_hash ||
          d.local_storage_uuid === p.local_storage_uuid)
    );
    if (dup) return { status: 409, data: { error: "already_applied" } };

    const app: Application = {
      id: uuid(),
      listing_id: p.listing_id,
      fingerprint_hash: p.fingerprint_hash,
      local_storage_uuid: p.local_storage_uuid,
      bio: p.bio,
      why_apply: p.why_apply,
      name: p.name,
      age: p.age,
      applicant_location: p.applicant_location,
      photo_url: p.photo_url,
      social_link: p.social_link,
      is_revealed: false,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    s.applications.push(app);
    s.dedup.push({
      listing_id: p.listing_id,
      fingerprint_hash: p.fingerprint_hash,
      local_storage_uuid: p.local_storage_uuid,
    });
    return { status: 200, data: { success: true, application_id: app.id } };
  },

  async recordTosAcceptance(fingerprintHash: string, localStorageUuid: string) {
    const s = getDemoStore();
    s.tos.push({
      fingerprint_hash: fingerprintHash,
      local_storage_uuid: localStorageUuid,
    });
  },
};

export type DemoBackend = typeof demoBackend;
