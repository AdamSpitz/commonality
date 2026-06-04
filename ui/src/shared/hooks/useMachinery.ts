import { useMemo } from 'react'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk'
import { getRuntimeConfigValue } from '../runtimeConfig'

export function useMachinery(): SDKMachinery {
  return useMemo(() => {
    const indexerUrl = getRuntimeConfigValue('VITE_GRAPHQL_URL') || 'http://localhost:42069/graphql'
    const ipfsConfig = {
      gatewayUrl: getRuntimeConfigValue('VITE_IPFS_GATEWAY'),
      apiUrl: getRuntimeConfigValue('VITE_IPFS_API'),
    };
    const twitterApiConfig = {
      platformApiBaseUrl: getRuntimeConfigValue('VITE_PLATFORM_API_URL') || 'http://localhost:3001',
      ethereumMainnetRpcUrl: getRuntimeConfigValue('VITE_MAINNET_RPC_URL'),
    };
    // Event cache requests use relative paths (/api/...) so the Vite dev server
    // proxy forwards them to the indexer. IPFS bundles load config.json next to
    // the static assets so this URL can vary by local/testnet/mainnet bundle
    // without rebuilding the JS.
    const eventCacheUrl = getRuntimeConfigValue('VITE_EVENT_CACHE_URL') ?? ''
    const contractAddresses = {
      beliefs: getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS') as `0x${string}`,
      implications: getRuntimeConfigValue('VITE_IMPLICATIONS_CONTRACT_ADDRESS') as `0x${string}`,
      assuranceContractFactory: getRuntimeConfigValue('VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS') as `0x${string}`,
      erc1155Factory: getRuntimeConfigValue('VITE_ERC1155_FACTORY_ADDRESS') as `0x${string}`,
      marketplaceFactory: getRuntimeConfigValue('VITE_MARKETPLACE_FACTORY_ADDRESS') as `0x${string}`,
      delegatableNotes: getRuntimeConfigValue('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS') as `0x${string}`,
      recurringPledges: getRuntimeConfigValue('VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS') as `0x${string}` | undefined,
      noteIntent: getRuntimeConfigValue('VITE_NOTE_INTENT_CONTRACT_ADDRESS') as `0x${string}`,
      alignmentAttestations: getRuntimeConfigValue('VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS') as `0x${string}`,
      mutableRefUpdater: getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}`,
      trustRegistry: getRuntimeConfigValue('VITE_TRUST_REGISTRY_CONTRACT_ADDRESS') as `0x${string}`,
      nudgePublications: getRuntimeConfigValue('VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS') as `0x${string}` | undefined,
      contentRegistry: getRuntimeConfigValue('VITE_CONTENT_REGISTRY_ADDRESS') as `0x${string}` | undefined,
      channelRegistry: getRuntimeConfigValue('VITE_CHANNEL_REGISTRY_ADDRESS') as `0x${string}` | undefined,
      channelEscrow: getRuntimeConfigValue('VITE_CHANNEL_ESCROW_ADDRESS') as `0x${string}` | undefined,
      creatorContractFactory: getRuntimeConfigValue('VITE_CREATOR_CONTRACT_FACTORY_ADDRESS') as `0x${string}` | undefined,
    }
    const ethRpcUrl = getRuntimeConfigValue('VITE_ETH_RPC_URL')
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
