import { useMemo } from 'react'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk'

export function useMachinery(): SDKMachinery {
  return useMemo(() => {
    const indexerUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'
    const ipfsConfig = {
      gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY,
      apiUrl: import.meta.env.VITE_IPFS_API,
    };
    const twitterApiConfig = {
      twitterApiDotIoApiKey: import.meta.env.VITE_X_API_KEY || '',
      platformApiBaseUrl: import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:3001',
    };
    // Event cache requests use relative paths (/api/...) so the Vite dev server
    // proxy forwards them to the indexer. An explicit override can be set via
    // VITE_EVENT_CACHE_URL for non-proxied deployments.
    const eventCacheUrl = import.meta.env.VITE_EVENT_CACHE_URL ?? ''
    const contractAddresses = {
      beliefs: import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}`,
      implications: import.meta.env.VITE_IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}`,
      assuranceContractFactory: import.meta.env.VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS as `0x${string}`,
      erc1155Factory: import.meta.env.VITE_ERC1155_FACTORY_ADDRESS as `0x${string}`,
      marketplaceFactory: import.meta.env.VITE_MARKETPLACE_FACTORY_ADDRESS as `0x${string}`,
      delegatableNotes: import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS as `0x${string}`,
      noteIntent: import.meta.env.VITE_NOTE_INTENT_CONTRACT_ADDRESS as `0x${string}`,
      alignmentAttestations: import.meta.env.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS as `0x${string}`,
      mutableRefUpdater: import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}`,
      trustRegistry: import.meta.env.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
      nudgePublications: import.meta.env.VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS as `0x${string}` | undefined,
      contentRegistry: import.meta.env.VITE_CONTENT_REGISTRY_ADDRESS as `0x${string}` | undefined,
      channelRegistry: import.meta.env.VITE_CHANNEL_REGISTRY_ADDRESS as `0x${string}` | undefined,
      channelEscrow: import.meta.env.VITE_CHANNEL_ESCROW_ADDRESS as `0x${string}` | undefined,
      creatorContractFactory: import.meta.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS as `0x${string}` | undefined,
    }
    const ethRpcUrl = import.meta.env.VITE_ETH_RPC_URL
    const publicClient = ethRpcUrl
      ? createPublicClient({ chain: hardhat, transport: http(ethRpcUrl) })
      : undefined
    return createSDKMachinery(
      indexerUrl,
      ipfsConfig,
      twitterApiConfig,
      undefined,
      publicClient as any,
      eventCacheUrl,
      contractAddresses,
    )
  }, [])
}
