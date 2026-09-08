import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getOrCreateVisitorUUID,
  hasTosAccepted,
  setTosAccepted,
} from '../localStorage'

// Minimal localStorage stub — the module only uses getItem/setItem.
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('localStorage helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStorage())
  })

  it('creates and persists a visitor UUID', () => {
    const first = getOrCreateVisitorUUID()
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(getOrCreateVisitorUUID()).toBe(first) // stable across calls
  })

  it('tracks ToS acceptance with a timestamp flag', () => {
    expect(hasTosAccepted()).toBe(false)
    setTosAccepted()
    expect(hasTosAccepted()).toBe(true)
  })
})
