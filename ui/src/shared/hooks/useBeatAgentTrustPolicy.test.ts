import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BEAT_AGENT_TRUST_POLICY_KEY, loadBeatAgentTrustPolicy, saveBeatAgentTrustPolicy } from './useBeatAgentTrustPolicy'

const storage = window.localStorage

describe('useBeatAgentTrustPolicy', () => {
  beforeEach(() => {
    storage.clear()
  })

  afterEach(() => {
    storage.clear()
  })

  describe('loadBeatAgentTrustPolicy', () => {
    it('returns default policy (threshold 0) when nothing is stored', () => {
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(0)
    })

    it('loads a saved threshold', () => {
      storage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify({ minAmbientDiversityThreshold: 0.65 }))
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(0.65)
    })

    it('clamps threshold above 1 down to 1', () => {
      storage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify({ minAmbientDiversityThreshold: 1.5 }))
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(1)
    })

    it('clamps threshold below 0 up to 0', () => {
      storage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify({ minAmbientDiversityThreshold: -0.1 }))
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(0)
    })

    it('returns default policy on invalid JSON', () => {
      storage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, 'not-json')
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(0)
    })

    it('returns default policy when threshold is not a number', () => {
      storage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify({ minAmbientDiversityThreshold: 'high' }))
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(0)
    })
  })

  describe('saveBeatAgentTrustPolicy', () => {
    it('persists the threshold so loadBeatAgentTrustPolicy reads it back', () => {
      saveBeatAgentTrustPolicy({ minAmbientDiversityThreshold: 0.75 })
      expect(loadBeatAgentTrustPolicy().minAmbientDiversityThreshold).toBe(0.75)
    })
  })
})
