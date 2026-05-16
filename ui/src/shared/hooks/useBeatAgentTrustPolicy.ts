import { useState, useCallback } from 'react'

interface AmbientCitation {
  diversityScore?: number
}

interface ExplanationWithAmbient {
  ambientContextUsed?: AmbientCitation[]
}

export const BEAT_AGENT_TRUST_POLICY_KEY = 'commonality:beatAgentTrustPolicy'

export interface BeatAgentTrustPolicy {
  minAmbientDiversityThreshold: number  // 0.0–1.0; 0 means no filter
}

const DEFAULT_POLICY: BeatAgentTrustPolicy = {
  minAmbientDiversityThreshold: 0,
}

export function loadBeatAgentTrustPolicy(): BeatAgentTrustPolicy {
  try {
    const stored = localStorage.getItem(BEAT_AGENT_TRUST_POLICY_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (parsed && typeof parsed === 'object' && 'minAmbientDiversityThreshold' in parsed) {
        const threshold = (parsed as { minAmbientDiversityThreshold: unknown }).minAmbientDiversityThreshold
        if (typeof threshold === 'number' && isFinite(threshold)) {
          return { minAmbientDiversityThreshold: Math.max(0, Math.min(1, threshold)) }
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_POLICY }
}

export function saveBeatAgentTrustPolicy(policy: BeatAgentTrustPolicy): void {
  localStorage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify(policy))
}

/**
 * Returns true when any ambient citation has a diversity score below the threshold.
 * Returns false when there are no scored citations or the threshold is 0.
 */
export function checkTrustPolicyViolation(
  explanation: ExplanationWithAmbient | null,
  minAmbientDiversityThreshold: number,
): boolean {
  if (!explanation || minAmbientDiversityThreshold <= 0) return false
  const ambient = explanation.ambientContextUsed ?? []
  const scored = ambient.filter((item) => typeof item.diversityScore === 'number')
  if (scored.length === 0) return false
  return scored.some((item) => (item.diversityScore as number) < minAmbientDiversityThreshold)
}

export function useBeatAgentTrustPolicy(): [BeatAgentTrustPolicy, (policy: BeatAgentTrustPolicy) => void] {
  const [policy, setPolicy] = useState<BeatAgentTrustPolicy>(loadBeatAgentTrustPolicy)

  const save = useCallback((newPolicy: BeatAgentTrustPolicy) => {
    setPolicy(newPolicy)
    saveBeatAgentTrustPolicy(newPolicy)
  }, [])

  return [policy, save]
}
