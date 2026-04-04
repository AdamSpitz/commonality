/// <reference lib="webworker" />

import {
  getDirectTrustMapping,
  getTrustedSet,
  type SDKMachinery,
} from '@commonality/sdk'
import type {
  SubjectivTrustWorkerRequest,
  SubjectivTrustWorkerResponse,
} from '../subjectivTrust'

function createSubjectivMachinery(
  request: SubjectivTrustWorkerRequest
): SDKMachinery {
  return {
    indexerUrl: '',
    ipfsConfig: {},
    testConfig: {},
    eventCacheUrl: request.eventCacheUrl,
    contractAddresses: request.contractAddresses,
  }
}

self.addEventListener('message', async (event: MessageEvent<SubjectivTrustWorkerRequest>) => {
  const request = event.data

  if (request.type !== 'computeTrustedSet') {
    return
  }

  try {
    const machinery = createSubjectivMachinery(request)
    const directTrust = await getDirectTrustMapping(machinery, request.address)
    const trustedSet = directTrust.size > 0 ? await getTrustedSet(machinery, request.address) : undefined

    const response: SubjectivTrustWorkerResponse = {
      type: 'trustedSetResult',
      requestId: request.requestId,
      hasDirectTrust: directTrust.size > 0,
      trustedSet: trustedSet ? Array.from(trustedSet) : [],
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
