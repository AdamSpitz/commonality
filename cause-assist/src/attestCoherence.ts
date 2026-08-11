/**
 * Operator coherence attestation: bind to published roster content, re-judge
 * construction with the LLM, then write on-chain only when coherent.
 * Never publishes a negative judgment. Never mints badges from the heuristic fallback.
 */

import {
  getCoherenceAttesterAddress,
  isCoherenceAttesterConfigured,
  publishCoherenceAttestation,
} from './blockchain.js'
import {
  bindRosterPayload,
  type BindRosterFailureReason,
  type LoadStatementText,
} from './bindRosterPayload.js'
import {
  checkCoherence,
  type CoherenceCheckRequest,
  type CoherenceVerdict,
} from './coherenceCheck.js'
import type { CauseAssistConfig, CoherenceAttestRequest } from './types.js'

export type AttestCoherenceReason =
  | 'attested'
  | 'already_attested'
  | 'not_coherent'
  | 'attester_not_configured'
  | 'judgment_unavailable'
  | BindRosterFailureReason

export interface AttestCoherenceResult {
  attested: boolean
  reason: AttestCoherenceReason
  verdict?: CoherenceVerdict
  attesterAddress?: `0x${string}`
  txHash?: `0x${string}`
}

export interface AttestCoherenceDeps {
  loadStatementText: LoadStatementText
  checkCoherenceFn?: (
    request: CoherenceCheckRequest,
    config: CauseAssistConfig,
  ) => Promise<CoherenceVerdict>
  publishFn?: typeof publishCoherenceAttestation
}

export async function attestCoherenceIfJudged(
  request: CoherenceAttestRequest,
  config: CauseAssistConfig,
  deps: AttestCoherenceDeps,
): Promise<AttestCoherenceResult> {
  const bound = await bindRosterPayload(request, deps.loadStatementText)
  if (!bound.ok) {
    return { attested: false, reason: bound.reason }
  }

  const check = deps.checkCoherenceFn ?? checkCoherence
  const verdict = await check(bound.payload, config)

  // Heuristic is for offline preview only — never spend the operator key on it.
  if (verdict.source !== 'llm') {
    return { attested: false, reason: 'judgment_unavailable', verdict }
  }

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

  const publish = deps.publishFn ?? publishCoherenceAttestation
  const { txHash, attesterAddress, alreadyAttested } = await publish(
    config,
    bound.payload.rosterCid,
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
