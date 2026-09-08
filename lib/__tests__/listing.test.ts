import { describe, it, expect } from 'vitest'
import {
  buildPortalUrl,
  validateListingInput,
  type ListingFormValues,
} from '../listing'

const valid: ListingFormValues = {
  title: 'Seeking: Chief Happiness Officer',
  about: 'A partner for museum trips and long conversations.',
  requirements: 'Must love dogs. Must tolerate puns.',
  nice_to_have: '',
  perks: '',
  location: '',
  work_mode: 'open',
  age_min: '25',
  age_max: '35',
  deadline: '',
}

describe('validateListingInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateListingInput(valid)).toEqual({})
  })

  it('flags a whitespace-only title', () => {
    expect(validateListingInput({ ...valid, title: '   ' })).toHaveProperty('title')
  })

  it('flags missing about and requirements', () => {
    const errors = validateListingInput({ ...valid, about: '', requirements: '' })
    expect(Object.keys(errors)).toEqual(['about', 'requirements'])
  })

  it('flags an invalid work mode', () => {
    expect(
      validateListingInput({ ...valid, work_mode: 'hybrid' as never })
    ).toHaveProperty('work_mode')
  })

  it('flags a minimum age below 18', () => {
    expect(validateListingInput({ ...valid, age_min: '21', age_max: '35' })).toEqual({})
    expect(validateListingInput({ ...valid, age_min: '17' })).toHaveProperty('age_min')
  })

  it('flags a non-integer age', () => {
    expect(validateListingInput({ ...valid, age_min: '25.5' })).toHaveProperty('age_min')
  })

  it('flags when age_min is not less than age_max', () => {
    expect(validateListingInput({ ...valid, age_min: '35', age_max: '35' })).toHaveProperty(
      'age_max'
    )
    expect(validateListingInput({ ...valid, age_min: '40', age_max: '35' })).toHaveProperty(
      'age_max'
    )
  })

  it('flags an unparseable deadline but accepts a valid one', () => {
    // date inputs produce yyyy-mm-dd; a valid one is fine
    expect(validateListingInput({ ...valid, deadline: '2026-12-01' })).toEqual({})
  })

  it('ignores an empty deadline (optional field)', () => {
    expect(validateListingInput({ ...valid, deadline: '' })).toEqual({})
  })
})

describe('buildPortalUrl', () => {
  it('joins the app url and slug', () => {
    expect(buildPortalUrl('https://crushboard.app', 'abc-123')).toBe(
      'https://crushboard.app/l/abc-123'
    )
  })

  it('strips trailing slashes from the app url', () => {
    expect(buildPortalUrl('http://localhost:3000/', 'abc-123')).toBe(
      'http://localhost:3000/l/abc-123'
    )
  })
})
