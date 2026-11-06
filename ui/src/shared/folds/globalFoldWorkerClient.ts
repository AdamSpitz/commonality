import type { DeployedContractAddresses, SDKMachinery } from '@commonality/sdk/machinery'

export interface FoldWorkerConfig {
  eventCacheUrl?: string
  contractAddresses?: DeployedContractAddresses
  defaultChainId?: number
  gatewayUrl?: string
  ethRpcUrl?: string
  chainId?: number
  settlementTokenAddresses?: `0x${string}`[]
}

export interface FoldWorkerRequest {
  type: 'runFold'
  requestId: number
  name: string
  args: readonly unknown[]
  config: FoldWorkerConfig
}

export type FoldWorkerResponse =
  | { type: 'foldResult'; requestId: number; result: unknown }
  | { type: 'foldError'; requestId: number; error: string }

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

let workerInstance: Worker | null = null
let nextRequestId = 1
const pendingRequests = new Map<number, PendingRequest>()

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

function handleWorkerMessage(event: MessageEvent<FoldWorkerResponse>): void {
  const message = event.data
  const pending = pendingRequests.get(message.requestId)
  if (!pending) return
  pendingRequests.delete(message.requestId)
  if (message.type === 'foldResult') {
    pending.resolve(message.result)
    return
  }
  pending.reject(new Error(message.error))
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./globalFoldWorker.ts', import.meta.url), { type: 'module' })
    workerInstance.addEventListener('message', handleWorkerMessage)
    workerInstance.addEventListener('error', () => {
      resetWorker('Global fold worker crashed')
    })
    workerInstance.addEventListener('messageerror', () => {
      resetWorker('Global fold worker produced an unreadable response')
    })
  }
  return workerInstance
}

export function createOffThreadGlobalFold(
  config: FoldWorkerConfig,
): NonNullable<SDKMachinery['offThreadGlobalFold']> | undefined {
  if (typeof Worker === 'undefined') return undefined
  return (name, args) => {
    const worker = getWorker()
    if (!worker) {
      return Promise.reject(new Error('Global fold worker is unavailable'))
    }
    const requestId = nextRequestId++
    const request: FoldWorkerRequest = { type: 'runFold', requestId, name, args, config }
    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject })
      worker.postMessage(request)
    })
  }
}
