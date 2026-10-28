/// <reference lib="webworker" />

import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk/machinery'
import {
  browseStatements,
  browseStatementsByMostSupporters,
  browseStatementsByNewest,
  getAllStatements,
} from '@commonality/sdk/conceptspace'
import { getAllProjects } from '@commonality/sdk/lazy-giving'
import { createPublicClient, http } from 'viem'
import { baseSepolia, hardhat, mainnet } from 'viem/chains'
import { createIndexedDbFoldStore } from '../stores/foldCache'
import type { FoldWorkerRequest, FoldWorkerResponse } from './globalFoldWorkerClient'

function chainForId(chainId: number) {
  switch (chainId) {
    case mainnet.id:
      return mainnet
    case baseSepolia.id:
      return baseSepolia
    default:
      return hardhat
  }
}

function machineryFromConfig(config: FoldWorkerRequest['config']): SDKMachinery {
  const chainId = config.chainId ?? hardhat.id
  const publicClient = config.ethRpcUrl
    ? createPublicClient({ chain: chainForId(chainId), transport: http(config.ethRpcUrl) })
    : undefined
  return createSDKMachinery({
    ipfsConfig: { gatewayUrl: config.gatewayUrl },
    eventCacheUrl: config.eventCacheUrl,
    contractAddresses: config.contractAddresses,
    defaultChainId: config.defaultChainId,
    settlementTokenAddresses: config.settlementTokenAddresses,
    publicClient: publicClient as SDKMachinery['publicClient'],
    foldStore: createIndexedDbFoldStore(),
  })
}

async function runFold(request: FoldWorkerRequest): Promise<unknown> {
  const machinery = machineryFromConfig(request.config)
  switch (request.name) {
    case 'getAllProjects':
      return getAllProjects(machinery)
    case 'browseStatements':
      return browseStatements(machinery, request.args[0] as never)
    case 'browseStatementsByNewest':
      return browseStatementsByNewest(machinery, request.args[0] as never)
    case 'browseStatementsByMostSupporters':
      return browseStatementsByMostSupporters(machinery, request.args[0] as never)
    case 'getAllStatements':
      return getAllStatements(machinery, request.args[0] as never)
    default:
      throw new Error(`Unknown global fold: ${request.name}`)
  }
}

self.addEventListener('message', async (event: MessageEvent<FoldWorkerRequest>) => {
  const request = event.data
  try {
    const result = await runFold(request)
    const response: FoldWorkerResponse = { type: 'foldResult', requestId: request.requestId, result }
    self.postMessage(response)
  } catch (error) {
    const response: FoldWorkerResponse = {
      type: 'foldError',
      requestId: request.requestId,
      error: error instanceof Error ? error.message : 'Global fold failed',
    }
    self.postMessage(response)
  }
})
