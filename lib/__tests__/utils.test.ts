import { describe, it, expect, vi, afterEach } from 'vitest'
import { getAppUrl } from '../utils'

describe('getAppUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the NEXT_PUBLIC_APP_URL value without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://crushboard.app/')
    expect(getAppUrl()).toBe('https://crushboard.app')
  })

  it('falls back to http://localhost:3000 when the env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(getAppUrl()).toBe('http://localhost:3000')
  })
})
