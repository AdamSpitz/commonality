import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadDefaultTrustedContentAttesters,
  loadTrustedContentAttesters,
  saveTrustedContentAttesters,
  TRUSTED_CONTENT_ATTESTERS_KEY,
  useTrustedContentAttesters,
} from './useTrustedContentAttesters'

const CONTENT_ATTESTER = '0xaabbccddaabbccddaabbccddaabbccddaabbccdd'
const BEAT_AGENT = '0x1234567890123456789012345678901234567890'
const storage = window.localStorage

describe('useTrustedContentAttesters', () => {
  beforeEach(() => {
    storage.clear()
    vi.stubEnv('VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS', '')
    vi.stubEnv('VITE_DEFAULT_TRUSTED_BEAT_AGENTS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('loads structured entries from localStorage', () => {
    storage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      { address: CONTENT_ATTESTER, kind: 'content-attester', name: 'Neutral attester' },
      { address: BEAT_AGENT, kind: 'beat-agent', serviceUrl: 'http://localhost:3020' },
    ]))

    expect(loadTrustedContentAttesters()).toEqual([
      { address: CONTENT_ATTESTER, kind: 'content-attester', name: 'Neutral attester' },
      { address: BEAT_AGENT, kind: 'beat-agent', serviceUrl: 'http://localhost:3020' },
    ])
  })

  it('keeps backward-compatible string entries as content attesters', () => {
    storage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([CONTENT_ATTESTER]))
    expect(loadTrustedContentAttesters()).toEqual([{ address: CONTENT_ATTESTER, kind: 'content-attester' }])
  })

  it('loads separate default content-attester and beat-agent env vars', () => {
    vi.stubEnv('VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS', CONTENT_ATTESTER)
    vi.stubEnv('VITE_DEFAULT_TRUSTED_BEAT_AGENTS', BEAT_AGENT)

    expect(loadDefaultTrustedContentAttesters()).toEqual([
      { address: CONTENT_ATTESTER, kind: 'content-attester' },
      { address: BEAT_AGENT, kind: 'beat-agent' },
    ])
  })

  it('prefers localStorage over env defaults', () => {
    storage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([{ address: BEAT_AGENT, kind: 'beat-agent' }]))
    vi.stubEnv('VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS', CONTENT_ATTESTER)

    expect(loadTrustedContentAttesters()).toEqual([{ address: BEAT_AGENT, kind: 'beat-agent' }])
  })

  it('filters invalid addresses and duplicate addresses', () => {
    storage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      { address: CONTENT_ATTESTER, kind: 'content-attester' },
      { address: 'not-an-address', kind: 'beat-agent' },
      { address: CONTENT_ATTESTER.toUpperCase(), kind: 'beat-agent' },
    ]))

    expect(loadTrustedContentAttesters()).toEqual([{ address: CONTENT_ATTESTER, kind: 'content-attester' }])
  })

  it('saves entries to localStorage', () => {
    saveTrustedContentAttesters([{ address: BEAT_AGENT, kind: 'beat-agent', name: 'US politics beat' }])
    expect(JSON.parse(storage.getItem(TRUSTED_CONTENT_ATTESTERS_KEY)!)).toEqual([
      { address: BEAT_AGENT, kind: 'beat-agent', name: 'US politics beat' },
    ])
  })

  it('returns attesters from the hook', () => {
    storage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([{ address: BEAT_AGENT, kind: 'beat-agent' }]))
    const { result } = renderHook(() => useTrustedContentAttesters())
    expect(result.current).toEqual([{ address: BEAT_AGENT, kind: 'beat-agent' }])
  })
})
