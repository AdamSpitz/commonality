export const SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT = 'commonality:subjectiv-trust-network-invalidated'
export const SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function notifySubjectivTrustNetworkInvalidated(): void {
  window.dispatchEvent(new Event(SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT))
}
