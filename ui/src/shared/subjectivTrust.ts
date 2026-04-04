export const SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT = 'commonality:subjectiv-trust-network-invalidated'
export const SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export interface SubjectivTrustedSetComputationResult {
  hasDirectTrust: boolean
  trustedSet: string[]
}

export interface SubjectivTrustWorkerRequest {
  type: 'computeTrustedSet'
  requestId: number
  address: string
  eventCacheUrl: string
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
      type: 'trustedSetResult'
      requestId: number
      hasDirectTrust: boolean
      trustedSet: string[]
    }
  | {
      type: 'trustedSetError'
      requestId: number
      error: string
    }

export function notifySubjectivTrustNetworkInvalidated(): void {
  window.dispatchEvent(new Event(SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT))
}
