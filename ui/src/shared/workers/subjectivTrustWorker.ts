/// <reference lib="webworker" />

import type {
  SubjectivTrustWorkerRequest,
  SubjectivTrustWorkerResponse,
} from '../subjectivTrust'
import { computeSubjectivTrustedSetResult } from '../subjectivTrustComputation'

self.addEventListener('message', async (event: MessageEvent<SubjectivTrustWorkerRequest>) => {
  const request = event.data

  if (request.type !== 'computeTrustedSet') {
    return
  }

  try {
    const result = await computeSubjectivTrustedSetResult({
      address: request.address,
      eventCacheUrl: request.eventCacheUrl,
      contractAddresses: request.contractAddresses,
      cachedDirectTrustMappings: request.cachedDirectTrustMappings,
      onProgress: (update) => {
        const progressResponse: SubjectivTrustWorkerResponse = {
          type: 'trustedSetProgress',
          requestId: request.requestId,
          hasDirectTrust: update.hasDirectTrust,
          trustedSet: update.trustedSet,
        }

        self.postMessage(progressResponse)
      },
    })

    const response: SubjectivTrustWorkerResponse = {
      type: 'trustedSetResult',
      requestId: request.requestId,
      hasDirectTrust: result.hasDirectTrust,
      trustedSet: result.trustedSet,
      directTrustMappings: result.directTrustMappings,
    }

    self.postMessage(response)
  } catch (error) {
    const response: SubjectivTrustWorkerResponse = {
      type: 'trustedSetError',
      requestId: request.requestId,
      error: error instanceof Error ? error.message : 'Failed to build trust network',
    }

    self.postMessage(response)
  }
})
