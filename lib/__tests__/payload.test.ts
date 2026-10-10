import { describe, it, expect } from 'vitest'
import { toListingPayload, type ListingFormValues } from '../listing'

const values: ListingFormValues = {
  title: '  Seeking: Chief Happiness Officer  ',
  about: '  A partner for museum trips.  ',
  requirements: ' Must love dogs. ',
  nice_to_have: '   ',
  perks: '',
  location: ' Lagos, NG ',
  work_mode: 'open',
  age_min: '25',
  age_max: '35',
  deadline: '',
}

describe('toListingPayload', () => {
  it('trims text fields and converts empty optionals to null', () => {
    const p = toListingPayload(values)
    expect(p.title).toBe('Seeking: Chief Happiness Officer')
    expect(p.about).toBe('A partner for museum trips.')
    expect(p.requirements).toBe('Must love dogs.')
    expect(p.nice_to_have).toBeNull()
    expect(p.perks).toBeNull()
    expect(p.location).toBe('Lagos, NG')
  })

  it('casts ages to numbers and keeps work mode', () => {
    const p = toListingPayload(values)
    expect(p.age_min).toBe(25)
    expect(p.age_max).toBe(35)
    expect(p.work_mode).toBe('open')
  })

  it('maps an empty deadline to null and a date to an ISO timestamp', () => {
    expect(toListingPayload(values).deadline).toBeNull()
    const p = toListingPayload({ ...values, deadline: '2026-12-01' })
    expect(p.deadline).toBe(new Date('2026-12-01').toISOString())
  })
})
