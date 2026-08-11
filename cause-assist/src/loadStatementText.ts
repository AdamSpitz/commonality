/**
 * Resolve published statement text for a plank CID via the SDK document reader.
 */

import { createPublicClient, http, type Chain } from 'viem'
import { hardhat } from 'viem/chains'
import {
  createDefaultDocumentStore,
} from '@commonality/sdk/displayable-documents'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk/machinery'
import type { CauseAssistConfig } from './types.js'
import type { LoadStatementText } from './bindRosterPayload.js'

function chainForId(chainId: number): Chain {
  if (chainId === hardhat.id) return hardhat
  return {
    ...hardhat,
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: hardhat.nativeCurrency,
    rpcUrls: hardhat.rpcUrls,
  }
}

/** Build read-only machinery for loading PublishedData / IPFS documents. */
export function createCauseAssistMachinery(config: CauseAssistConfig): SDKMachinery | null {
  const rpcUrl = config.ethereumRpcUrl?.trim()
  const gatewayUrl = config.ipfsGatewayUrl?.trim()
  const eventCacheUrl = config.eventCacheUrl?.trim()

  if (!rpcUrl && !gatewayUrl && !eventCacheUrl) {
    return null
  }

  const chainId = config.chainId ?? hardhat.id
  const publicClient = rpcUrl
    ? createPublicClient({
        chain: chainForId(chainId),
        transport: http(rpcUrl),
      })
    : undefined

  const contractAddresses = config.publishedDataContractAddress
    ? {
        // createDefaultDocumentReader only needs publishedData when using the API path;
        // other fields are required by the type but unused for content reads.
        beliefs: '0x0000000000000000000000000000000000000001' as `0x${string}`,
        implications: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        assuranceContractFactory: '0x0000000000000000000000000000000000000003' as `0x${string}`,
        erc1155Factory: '0x0000000000000000000000000000000000000004' as `0x${string}`,
        delegatableNotes: '0x0000000000000000000000000000000000000005' as `0x${string}`,
        noteIntent: '0x0000000000000000000000000000000000000006' as `0x${string}`,
        alignmentAttestations: (config.alignmentAttestationsContractAddress
          || '0x0000000000000000000000000000000000000007') as `0x${string}`,
        mutableRefUpdater: '0x0000000000000000000000000000000000000008' as `0x${string}`,
        trustRegistry: '0x0000000000000000000000000000000000000009' as `0x${string}`,
        publishedData: config.publishedDataContractAddress as `0x${string}`,
      }
    : undefined

  return createSDKMachinery({
    ipfsConfig: gatewayUrl ? { gatewayUrl: gatewayUrl.replace(/\/$/, '') } : {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicClient: publicClient as any,
    eventCacheUrl,
    contractAddresses,
    defaultChainId: chainId,
  })
}

export function createLoadStatementText(
  machinery: SDKMachinery | null,
): LoadStatementText {
  if (!machinery) {
    return async () => null
  }

  const store = createDefaultDocumentStore(machinery)
  return async (plankCid: string) => {
    try {
      const read = await store.read(plankCid as never)
      if (read.status !== 'active') return null
      const content = read.document.content
      return typeof content === 'string' ? content : null
    } catch {
      return null
    }
  }
}
