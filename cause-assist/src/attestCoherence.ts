/**
 * Operator coherence attestation: re-judge construction, then write on-chain
 * only when coherent. Never publishes a negative judgment.
 */

import {
  getCoherenceAttesterAddress,
  isCoherenceAttesterConfigured,
  publishCoherenceAttestation,
} from './blockchain.js'
import {
  checkCoherence,
  type CoherenceCheckRequest,
  type CoherenceVerdict,
} from './coherenceCheck.js'
import type { CauseAssistConfig } from './types.js'

export type AttestCoherenceReason =
  | 'attested'
  | 'already_attested'
  | 'not_coherent'
  | 'attester_not_configured'

export interface AttestCoherenceResult {
  attested: boolean
  reason: AttestCoherenceReason
  verdict: CoherenceVerdict
  attesterAddress?: `0x${string}`
  txHash?: `0x${string}`
}

export async function attestCoherenceIfJudged(
  request: CoherenceCheckRequest,
  config: CauseAssistConfig,
): Promise<AttestCoherenceResult> {
  const verdict = await checkCoherence(request, config)

  if (!verdict.coherent) {
    return { attested: false, reason: 'not_coherent', verdict }
  }

  if (!isCoherenceAttesterConfigured(config)) {
    return {
      attested: false,
      reason: 'attester_not_configured',
      verdict,
      attesterAddress: getCoherenceAttesterAddress(config) ?? undefined,
    }
  }

  const { txHash, attesterAddress, alreadyAttested } = await publishCoherenceAttestation(
    config,
    request.rosterCid,
  )

  if (alreadyAttested) {
    return {
      attested: true,
      reason: 'already_attested',
      verdict,
      attesterAddress,
    }
  }

  return {
    attested: true,
    reason: 'attested',
    verdict,
    attesterAddress,
    txHash,
  }
}
