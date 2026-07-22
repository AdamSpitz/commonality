export const SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT = 'commonality:subjectiv-trust-network-invalidated'
export const SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS = 5 * 60 * 1000

/**
 * Per-attester cumulative transitive trust scores for the viewer (address (lowercase) -> score 0-100),
 * as produced by the Subjectiv trust graph. Used to weight success-confidence scoring so vouches from
 * the core of the viewer's network count more than vouches from its periphery.
 */
export type SubjectivTrustWeights = Record<string, number>

export interface SubjectivCachedDirectTrustEntry {
  trustee: string
  score: number
}

export type SubjectivCachedDirectTrustMappings = Record<string, SubjectivCachedDirectTrustEntry[]>

export interface SubjectivTrustedSetComputationResult {
  hasDirectTrust: boolean
  trustedSet: string[]
  trustWeights?: SubjectivTrustWeights
  directTrustMappings?: SubjectivCachedDirectTrustMappings
}

export interface SubjectivTrustedSetProgressUpdate {
  hasDirectTrust: boolean
  trustedSet: string[]
  trustWeights?: SubjectivTrustWeights
}

export interface SubjectivTrustWorkerRequest {
  type: 'computeTrustedSet'
  requestId: number
  address: string
  eventCacheUrl: string
  cachedDirectTrustMappings?: SubjectivCachedDirectTrustMappings
  /** Maximum trust-graph hops to traverse (default: full transitive network, see SDK). */
  maxHops?: number
  contractAddresses: {
    beliefs: `0x${string}`
    implications: `0x${string}`
    assuranceContractFactory: `0x${string}`
    erc1155Factory: `0x${string}`
    delegatableNotes: `0x${string}`
    noteIntent: `0x${string}`
    alignmentAttestations: `0x${string}`
    mutableRefUpdater: `0x${string}`
    trustRegistry: `0x${string}`
  }
}

export type SubjectivTrustWorkerResponse =
  | {
      type: 'trustedSetProgress'
      requestId: number
      hasDirectTrust: boolean
      trustedSet: string[]
      trustWeights?: SubjectivTrustWeights
    }
  | {
      type: 'trustedSetResult'
      requestId: number
      hasDirectTrust: boolean
      trustedSet: string[]
      trustWeights?: SubjectivTrustWeights
      directTrustMappings?: SubjectivCachedDirectTrustMappings
    }
  | {
      type: 'trustedSetError'
      requestId: number
      error: string
    }

export function notifySubjectivTrustNetworkInvalidated(): void {
  window.dispatchEvent(new Event(SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT))
}
