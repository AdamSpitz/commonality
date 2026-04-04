import {
  getDirectTrustMapping,
  getTrustedSet,
  type ContractAddresses,
  type SDKMachinery,
} from '@commonality/sdk'
import type {
  SubjectivTrustedSetComputationResult,
  SubjectivTrustWorkerRequest,
  SubjectivTrustWorkerResponse,
} from './subjectivTrust'

interface ComputeTrustedSetOptions {
  address: string
  eventCacheUrl: string
  contractAddresses: ContractAddresses
}

interface PendingRequest {
  resolve: (result: SubjectivTrustedSetComputationResult) => void
  reject: (error: Error) => void
}

let workerInstance: Worker | null = null
let nextRequestId = 1
const pendingRequests = new Map<number, PendingRequest>()

function createSubjectivMachinery({
  eventCacheUrl,
  contractAddresses,
}: Omit<ComputeTrustedSetOptions, 'address'>): SDKMachinery {
  return {
    indexerUrl: '',
    ipfsConfig: {},
    testConfig: {},
    eventCacheUrl,
    contractAddresses,
  }
}

async function computeTrustedSetOnMainThread(
  options: ComputeTrustedSetOptions
): Promise<SubjectivTrustedSetComputationResult> {
  const machinery = createSubjectivMachinery(options)
  const directTrust = await getDirectTrustMapping(machinery, options.address)

  if (directTrust.size === 0) {
    return {
      hasDirectTrust: false,
      trustedSet: [],
    }
  }

  const trustedSet = await getTrustedSet(machinery, options.address)
  return {
    hasDirectTrust: true,
    trustedSet: Array.from(trustedSet),
  }
}

function resetWorker(errorMessage: string): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }

  for (const { reject } of pendingRequests.values()) {
    reject(new Error(errorMessage))
  }

  pendingRequests.clear()
}

function handleWorkerMessage(event: MessageEvent<SubjectivTrustWorkerResponse>): void {
  const message = event.data
  const pendingRequest = pendingRequests.get(message.requestId)

  if (!pendingRequest) {
    return
  }

  pendingRequests.delete(message.requestId)

  if (message.type === 'trustedSetResult') {
    pendingRequest.resolve({
      hasDirectTrust: message.hasDirectTrust,
      trustedSet: message.trustedSet,
    })
    return
  }

  pendingRequest.reject(new Error(message.error))
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null
  }

  if (!workerInstance) {
    workerInstance = new Worker(new URL('./workers/subjectivTrustWorker.ts', import.meta.url), {
      type: 'module',
    })

    workerInstance.addEventListener('message', handleWorkerMessage)
    workerInstance.addEventListener('error', () => {
      resetWorker('Subjectiv trust worker crashed')
    })
    workerInstance.addEventListener('messageerror', () => {
      resetWorker('Subjectiv trust worker produced an unreadable response')
    })
  }

  return workerInstance
}

export async function computeSubjectivTrustedSet(
  options: ComputeTrustedSetOptions
): Promise<SubjectivTrustedSetComputationResult> {
  const worker = getWorker()

  if (!worker) {
    return computeTrustedSetOnMainThread(options)
  }

  const requestId = nextRequestId++
  const request: SubjectivTrustWorkerRequest = {
    type: 'computeTrustedSet',
    requestId,
    address: options.address,
    eventCacheUrl: options.eventCacheUrl,
    contractAddresses: options.contractAddresses,
  }

  return new Promise<SubjectivTrustedSetComputationResult>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject })
    worker.postMessage(request)
  })
}
