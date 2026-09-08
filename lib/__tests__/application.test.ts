import { describe, it, expect } from 'vitest'
import {
  validateApplicationInput,
  buildPhotoPath,
  type ApplicationFormValues,
} from '../application'

const valid: ApplicationFormValues = {
  name: 'Amara Okafor',
  age: '26',
  applicant_location: 'Lagos, Nigeria',
  bio: 'Seven years of experience in spontaneous weekend trips.',
  why_apply: 'I believe I would be a strong fit for this role.',
  social_link: '',
}

describe('validateApplicationInput', () => {
  it('returns no errors for valid input', () => {
    expect(validateApplicationInput(valid)).toEqual({})
  })

  it('flags a whitespace-only name', () => {
    expect(validateApplicationInput({ ...valid, name: '  ' })).toHaveProperty(
      'name'
    )
  })

  it('flags a non-integer or underage age', () => {
    expect(validateApplicationInput({ ...valid, age: '26.5' })).toHaveProperty(
      'age'
    )
    expect(validateApplicationInput({ ...valid, age: '17' })).toHaveProperty(
      'age'
    )
    expect(validateApplicationInput({ ...valid, age: '' })).toHaveProperty('age')
  })

  it('flags missing bio and why_apply', () => {
    const errors = validateApplicationInput({
      ...valid,
      bio: '',
      why_apply: '',
    })
    expect(Object.keys(errors)).toEqual(['bio', 'why_apply'])
  })

  it('accepts an empty social link but rejects a malformed one', () => {
    expect(
      validateApplicationInput({ ...valid, social_link: '' })
    ).toEqual({})
    expect(
      validateApplicationInput({ ...valid, social_link: 'instagram.com/amara' })
    ).toHaveProperty('social_link')
    expect(
      validateApplicationInput({
        ...valid,
        social_link: 'https://instagram.com/amara',
      })
    ).toEqual({})
  })
})

describe('buildPhotoPath', () => {
  it('scopes the path under the listing id and visitor uuid', () => {
    const path = buildPhotoPath(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    )
    expect(path).toMatch(
      /^11111111-1111-1111-1111-111111111111\/22222222-2222-2222-2222-222222222222-\d+$/
    )
  })
})
