import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { addTrustedNudger, isTrustedNudger, loadDefaultNudgers, loadTrustedNudgers, removeTrustedNudger, saveTrustedNudgers, TRUSTED_NUDGERS_KEY } from './useTrustedNudgers'

const VALID_ADDR_1 = '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
const VALID_ADDR_2 = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'

describe('loadDefaultNudgers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns empty array when env var is not set', () => {
    vi.stubEnv('VITE_DEFAULT_NUDGERS', '')
    expect(loadDefaultNudgers()).toEqual([])
  })

  it('parses comma-separated addresses', () => {
    vi.stubEnv('VITE_DEFAULT_NUDGERS', `${VALID_ADDR_1},${VALID_ADDR_2}`)
    expect(loadDefaultNudgers()).toEqual([
      { address: VALID_ADDR_1 },
      { address: VALID_ADDR_2 },
    ])
  })

  it('ignores invalid addresses in comma-separated format', () => {
    vi.stubEnv('VITE_DEFAULT_NUDGERS', `${VALID_ADDR_1},not-an-address`)
    expect(loadDefaultNudgers()).toEqual([{ address: VALID_ADDR_1 }])
  })

  it('parses JSON array of address strings', () => {
    vi.stubEnv('VITE_DEFAULT_NUDGERS', JSON.stringify([VALID_ADDR_1, VALID_ADDR_2]))
    expect(loadDefaultNudgers()).toEqual([
      { address: VALID_ADDR_1 },
      { address: VALID_ADDR_2 },
    ])
  })

  it('parses JSON array of TrustedNudgerEntry objects with serviceUrl', () => {
    const entries = [
      { address: VALID_ADDR_1, serviceUrl: 'http://nudger.example.com', name: 'My Nudger' },
      { address: VALID_ADDR_2 },
    ]
    vi.stubEnv('VITE_DEFAULT_NUDGERS', JSON.stringify(entries))
    expect(loadDefaultNudgers()).toEqual(entries)
  })

  it('parses JSON array of mixed strings and objects', () => {
    const input = [VALID_ADDR_1, { address: VALID_ADDR_2, serviceUrl: 'http://example.com' }]
    vi.stubEnv('VITE_DEFAULT_NUDGERS', JSON.stringify(input))
    expect(loadDefaultNudgers()).toEqual([
      { address: VALID_ADDR_1 },
      { address: VALID_ADDR_2, serviceUrl: 'http://example.com' },
    ])
  })

  it('ignores invalid addresses in JSON array', () => {
    const entries = [{ address: 'not-valid' }, { address: VALID_ADDR_1, serviceUrl: 'http://example.com' }]
    vi.stubEnv('VITE_DEFAULT_NUDGERS', JSON.stringify(entries))
    expect(loadDefaultNudgers()).toEqual([{ address: VALID_ADDR_1, serviceUrl: 'http://example.com' }])
  })

  it('falls back to comma-separated parsing when JSON is malformed', () => {
    // malformed JSON starting with '[' falls through; split on ',' yields no valid addresses
    vi.stubEnv('VITE_DEFAULT_NUDGERS', '[invalid json')
    expect(loadDefaultNudgers()).toEqual([])
  })
})

describe('loadTrustedNudgers', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_DEFAULT_NUDGERS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns localStorage entries when present', () => {
    const entries = [{ address: VALID_ADDR_1, serviceUrl: 'http://example.com' }]
    saveTrustedNudgers(entries)
    vi.stubEnv('VITE_DEFAULT_NUDGERS', VALID_ADDR_2)
    expect(loadTrustedNudgers()).toEqual(entries)
  })

  it('falls back to default nudgers when localStorage is empty', () => {
    const entries = [{ address: VALID_ADDR_1, serviceUrl: 'http://nudger.example.com', name: 'Default Nudger' }]
    vi.stubEnv('VITE_DEFAULT_NUDGERS', JSON.stringify(entries))
    expect(loadTrustedNudgers()).toEqual(entries)
  })

  it('normalizes legacy string entries from localStorage', () => {
    localStorage.setItem(TRUSTED_NUDGERS_KEY, JSON.stringify([VALID_ADDR_1]))
    expect(loadTrustedNudgers()).toEqual([{ address: VALID_ADDR_1 }])
  })

  it('returns empty array when nothing is configured', () => {
    expect(loadTrustedNudgers()).toEqual([])
  })

  it('adds and removes trusted nudgers', () => {
    addTrustedNudger({ address: VALID_ADDR_1, name: 'CSM mediator' })
    expect(isTrustedNudger(VALID_ADDR_1)).toBe(true)
    expect(loadTrustedNudgers()).toEqual([{ address: VALID_ADDR_1, name: 'CSM mediator' }])

    removeTrustedNudger(VALID_ADDR_1)
    expect(isTrustedNudger(VALID_ADDR_1)).toBe(false)
    expect(loadTrustedNudgers()).toEqual([])
  })

  it('deduplicates trusted nudgers by address', () => {
    addTrustedNudger({ address: VALID_ADDR_1, name: 'First' })
    addTrustedNudger({ address: VALID_ADDR_1.toLowerCase(), name: 'Second' })

    expect(loadTrustedNudgers()).toEqual([{ address: VALID_ADDR_1, name: 'First' }])
  })
})
