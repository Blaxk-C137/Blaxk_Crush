import { describe, it, expect, vi, afterEach } from 'vitest'
import { edgeFunctionUrl, callEdgeFunction } from '../edge'

describe('edgeFunctionUrl', () => {
  it('builds the function endpoint under the project url', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co')
    expect(edgeFunctionUrl('check-dedup')).toBe(
      'https://proj.supabase.co/functions/v1/check-dedup'
    )
    vi.unstubAllEnvs()
  })
})

describe('callEdgeFunction', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('POSTs the body with anon auth headers and returns status + json', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-123')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ already_applied: true }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await callEdgeFunction<{ already_applied: boolean }>(
      'check-dedup',
      { listing_id: 'abc', fingerprint_hash: 'f', local_storage_uuid: 'u' }
    )

    expect(result).toEqual({
      status: 200,
      data: { already_applied: true },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://proj.supabase.co/functions/v1/check-dedup')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      apikey: 'anon-key-123',
      Authorization: 'Bearer anon-key-123',
    })
    expect(JSON.parse(init.body)).toEqual({
      listing_id: 'abc',
      fingerprint_hash: 'f',
      local_storage_uuid: 'u',
    })
  })
})
