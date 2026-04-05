export const SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT = 'commonality:subjectiv-trust-network-invalidated'
export const SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export interface SubjectivCachedDirectTrustEntry {
  trustee: string
  score: number
}

export type SubjectivCachedDirectTrustMappings = Record<string, SubjectivCachedDirectTrustEntry[]>

export interface SubjectivTrustedSetComputationResult {
  hasDirectTrust: boolean
  trustedSet: string[]
  directTrustMappings?: SubjectivCachedDirectTrustMappings
}

export interface SubjectivTrustedSetProgressUpdate {
  hasDirectTrust: boolean
  trustedSet: string[]
}

export interface SubjectivTrustWorkerRequest {
  type: 'computeTrustedSet'
  requestId: number
  address: string
  eventCacheUrl: string
  cachedDirectTrustMappings?: SubjectivCachedDirectTrustMappings
  contractAddresses: {
    beliefs: `0x${string}`
    implications: `0x${string}`
    assuranceContractFactory: `0x${string}`
    erc1155Factory: `0x${string}`
    marketplaceFactory: `0x${string}`
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
    }
  | {
      type: 'trustedSetResult'
      requestId: number
      hasDirectTrust: boolean
      trustedSet: string[]
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
