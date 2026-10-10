import { describe, it, expect, beforeEach, vi } from 'vitest'

// demo-store imports 'server-only' (which throws under vitest) — stub it.
vi.mock('server-only', () => ({}))

import { demoBackend, getDemoStore } from '../server/demo-store'
import { DEMO_USER_ID } from '../env'
import type { ApplicationSubmission } from '../supabase/types'

const OTHER_USER = '11111111-2222-3333-4444-555555555555'

function submission(overrides: Partial<ApplicationSubmission> = {}): ApplicationSubmission {
  return {
    listing_id: getDemoStore().listings[0].id,
    fingerprint_hash: `fp_${crypto.randomUUID()}`,
    local_storage_uuid: `uuid_${crypto.randomUUID()}`,
    name: 'Test Candidate',
    age: 27,
    applicant_location: null,
    bio: 'A solid cover-letter-adjacent bio.',
    why_apply: 'A compelling reason to hire me.',
    photo_url: null,
    social_link: null,
    ...overrides,
  }
}

describe('demo backend', () => {
  beforeEach(() => {
    // Reset the seeded store between tests.
    const s = getDemoStore()
    s.applications.splice(0, s.applications.length)
    s.dedup.splice(0, s.dedup.length)
    s.listings[0].is_active = true
  })

  it('lists the demo user’s listings with application counts', async () => {
    const listings = await demoBackend.listListings(DEMO_USER_ID)
    expect(listings.length).toBeGreaterThanOrEqual(2)
    expect(listings.every((l) => l.user_id === DEMO_USER_ID)).toBe(true)
    const other = await demoBackend.listListings(OTHER_USER)
    expect(other).toEqual([])
  })

  it('scopes owned listings strictly by user', async () => {
    const id = getDemoStore().listings[0].id
    expect(
      await demoBackend.getOwnedListing(DEMO_USER_ID, id)
    ).not.toBeNull()
    expect(await demoBackend.getOwnedListing(OTHER_USER, id)).toBeNull()
  })

  it('accepts a valid application and then blocks duplicates (409)', async () => {
    const sub = submission()
    const first = await demoBackend.submitApplication(sub)
    expect(first.status).toBe(200)
    expect(first.data.success).toBe(true)

    // Same fingerprint → blocked
    const second = await demoBackend.submitApplication({
      ...sub,
      local_storage_uuid: 'uuid_other',
    })
    expect(second.status).toBe(409)

    // Same localStorage uuid → blocked
    const third = await demoBackend.submitApplication({
      ...sub,
      fingerprint_hash: 'fp_other',
    })
    expect(third.status).toBe(409)
  })

  it('runs the same dedup check via checkDedup', async () => {
    const sub = submission()
    await demoBackend.submitApplication(sub)
    const { status, data } = await demoBackend.checkDedup(
      sub.listing_id,
      sub.fingerprint_hash,
      'different-uuid'
    )
    expect(status).toBe(200)
    expect(data.already_applied).toBe(true)
  })

  it('rejects applications to closed listings (403)', async () => {
    getDemoStore().listings[0].is_active = false
    const res = await demoBackend.submitApplication(submission())
    expect(res.status).toBe(403)
    expect(res.data.error).toBe('listing_closed')
  })

  it('rejects applications to unknown listings (404)', async () => {
    const res = await demoBackend.submitApplication(
      submission({ listing_id: crypto.randomUUID() })
    )
    expect(res.status).toBe(404)
  })

  it('serves listers masked applications and unseals them on reveal', async () => {
    const sub = submission({ name: 'Jane Sealed', age: 30 })
    const { data } = (await demoBackend.submitApplication(sub)) as {
      data: { application_id: string }
    }

    const before = await demoBackend.listApplications(
      DEMO_USER_ID,
      sub.listing_id
    )
    const masked = before!.find((a) => a.id === data.application_id)!
    expect(masked.name).toBeNull()
    expect(masked.bio).toBe(sub.bio)

    const outsiders = await demoBackend.listApplications(
      OTHER_USER,
      sub.listing_id
    )
    expect(outsiders).toBeNull()

    const reveal = await demoBackend.revealApplication(
      DEMO_USER_ID,
      data.application_id
    )
    expect(reveal.error).toBeNull()

    const after = await demoBackend.listApplications(
      DEMO_USER_ID,
      sub.listing_id
    )
    const revealed = after!.find((a) => a.id === data.application_id)!
    expect(revealed.name).toBe('Jane Sealed')
    expect(revealed.age).toBe('30')
  })

  it('refuses to reveal applications on listings the user does not own', async () => {
    const { data } = (await demoBackend.submitApplication(submission())) as {
      data: { application_id: string }
    }
    const res = await demoBackend.revealApplication(
      OTHER_USER,
      data.application_id
    )
    expect(res.error).toBe('forbidden')
  })

  it('updates application status with ownership enforcement', async () => {
    const { data } = (await demoBackend.submitApplication(submission())) as {
      data: { application_id: string }
    }
    expect(
      (
        await demoBackend.updateApplicationStatus(
          OTHER_USER,
          data.application_id,
          'rejected'
        )
      ).error
    ).toBe('forbidden')

    expect(
      (
        await demoBackend.updateApplicationStatus(
          DEMO_USER_ID,
          data.application_id,
          'shortlisted'
        )
      ).error
    ).toBeNull()

    const apps = await demoBackend.listApplications(
      DEMO_USER_ID,
      submission({}).listing_id
    )
    expect(
      apps!.find((a) => a.id === data.application_id)!.status
    ).toBe('shortlisted')
  })

  it('creates, updates, and closes listings for the owner only', async () => {
    const { id } = await demoBackend.createListing(DEMO_USER_ID, {
      title: 'Seeking: Head of Shared Calendars',
      about: 'An open role.',
      requirements: 'Must love calendars.',
      nice_to_have: null,
      perks: null,
      location: null,
      work_mode: 'open',
      age_min: 25,
      age_max: 40,
      deadline: null,
    })
    expect(
      (await demoBackend.getOwnedListing(DEMO_USER_ID, id))!.title
    ).toBe('Seeking: Head of Shared Calendars')

    expect(await demoBackend.updateListing(OTHER_USER, id, {
      title: 'Hijacked',
      about: 'x',
      requirements: 'y',
      nice_to_have: null,
      perks: null,
      location: null,
      work_mode: 'open',
      age_min: 18,
      age_max: 99,
      deadline: null,
    })).toEqual({ error: 'not_found' })
    expect(
      (await demoBackend.getOwnedListing(DEMO_USER_ID, id))!.title
    ).toBe('Seeking: Head of Shared Calendars')

    expect(
      (await demoBackend.setListingActive(OTHER_USER, id, false)).error
    ).toBe('not_found')
    expect(
      (await demoBackend.setListingActive(DEMO_USER_ID, id, false)).error
    ).toBeNull()
    expect(
      (await demoBackend.getOwnedListing(DEMO_USER_ID, id))!.is_active
    ).toBe(false)
  })
})
