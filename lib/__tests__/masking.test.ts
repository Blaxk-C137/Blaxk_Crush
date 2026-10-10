import { describe, it, expect } from 'vitest'
import {
  maskApplication,
  computeStats,
  applicantNumber,
  STATUS_LABELS,
} from '../application'
import type { Application, ApplicationMasked } from '../supabase/types'

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    listing_id: 'listing-1',
    fingerprint_hash: 'fp_x',
    local_storage_uuid: 'uuid_x',
    bio: 'Seven years of experience in spontaneous weekend trips.',
    why_apply: 'I believe I would be a strong fit for this role.',
    name: 'Amara Okafor',
    age: 26,
    applicant_location: 'Lagos, Nigeria',
    photo_url: 'listing-1/uuid_x-123',
    social_link: 'https://instagram.com/amara',
    is_revealed: false,
    status: 'pending',
    created_at: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('maskApplication (mirrors applications_masked view)', () => {
  it('hides every identity field before reveal', () => {
    const masked = maskApplication(makeApp({ is_revealed: false }))
    expect(masked.name).toBeNull()
    expect(masked.age).toBeNull()
    expect(masked.applicant_location).toBeNull()
    expect(masked.photo_url).toBeNull()
    expect(masked.social_link).toBeNull()
  })

  it('exposes identity fields after reveal, with age as TEXT', () => {
    const masked = maskApplication(makeApp({ is_revealed: true }))
    expect(masked.name).toBe('Amara Okafor')
    expect(masked.age).toBe('26')
    expect(masked.applicant_location).toBe('Lagos, Nigeria')
    expect(masked.photo_url).toBe('listing-1/uuid_x-123')
    expect(masked.social_link).toBe('https://instagram.com/amara')
  })

  it('always exposes the anonymized fields and never the dedup identifiers', () => {
    const masked = maskApplication(makeApp())
    expect(masked.bio).toContain('spontaneous weekend trips')
    expect(masked.why_apply).toContain('strong fit')
    expect(masked.status).toBe('pending')
    expect(masked).not.toHaveProperty('fingerprint_hash')
    expect(masked).not.toHaveProperty('local_storage_uuid')
  })
})

describe('computeStats', () => {
  it('counts applications by status', () => {
    const apps = [
      makeApp({ id: 'a', status: 'pending' }),
      makeApp({ id: 'b', status: 'pending' }),
      makeApp({ id: 'c', status: 'shortlisted' }),
      makeApp({ id: 'd', status: 'rejected' }),
    ].map((a) => maskApplication(a))
    expect(computeStats(apps)).toEqual({
      total: 4,
      pending: 2,
      shortlisted: 1,
      rejected: 1,
    })
  })

  it('returns zeroes for an empty pipeline', () => {
    expect(computeStats([])).toEqual({
      total: 0,
      pending: 0,
      shortlisted: 0,
      rejected: 0,
    })
  })
})

describe('applicantNumber', () => {
  it('numbers applicants oldest-first regardless of input order', () => {
    const apps: ApplicationMasked[] = [
      makeApp({ id: 'newer', created_at: '2026-10-05T10:00:00.000Z' }),
      makeApp({ id: 'older', created_at: '2026-10-01T10:00:00.000Z' }),
    ].map(maskApplication)
    expect(applicantNumber(apps, 'older')).toBe(1)
    expect(applicantNumber(apps, 'newer')).toBe(2)
  })

  it('returns 0 for an unknown id', () => {
    expect(applicantNumber([], 'missing')).toBe(0)
  })
})

describe('STATUS_LABELS (spec §13 copy)', () => {
  it('uses the exact copy from the spec', () => {
    expect(STATUS_LABELS).toEqual({
      pending: 'Under review',
      shortlisted: 'Shortlisted',
      rejected: 'Position filled / not a fit',
    })
  })
})
