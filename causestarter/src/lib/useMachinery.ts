import { useMemo } from 'react'
import { createPublicClient, http } from 'viem'
import { baseSepolia, hardhat, mainnet } from 'viem/chains'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk/machinery'
import { getRuntimeConfigValue } from './runtimeConfig'

function chainForId(chainId: number) {
  switch (chainId) {
    case mainnet.id:
      return mainnet
    case baseSepolia.id:
      return baseSepolia
    case hardhat.id:
    default:
      return hardhat
  }
}

export function getEventCacheUrl(): string {
  const configured = getRuntimeConfigValue('VITE_EVENT_CACHE_URL')
  if (configured) return configured
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/**
 * Browser IPFS API base URL (legacy / hosting edge cases only).
 *
 * Statement content publish is PublishedData-first and does not require this.
 * Same-origin `/ipfs-api` (nginx → Kubo) remains available for any remaining
 * browser→API fallbacks when the SPA origin cannot talk to Kubo directly.
 * Explicit VITE_IPFS_API still wins when set (e.g. direct local node).
 */
export function getIpfsApiUrl(): string {
  const configured = getRuntimeConfigValue('VITE_IPFS_API')
  if (configured) {
    // Rewrite host-direct local API to same-origin proxy when the UI is served
    // from a different origin (Docker CauseStarter on :8090 → Kubo on :5001).
    if (typeof window !== 'undefined') {
      try {
        const api = new URL(configured, window.location.origin)
        const page = new URL(window.location.origin)
        const isLocalIpfsApi =
          (api.hostname === 'localhost' || api.hostname === '127.0.0.1')
          && (api.port === '5001' || api.port === '')
        if (isLocalIpfsApi && api.origin !== page.origin) {
          return `${page.origin}/ipfs-api`
        }
      } catch {
        // fall through to configured value
      }
    }
    return configured.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/ipfs-api`
  return ''
}

export function useMachinery(): SDKMachinery {
  return useMemo(() => {
    const ipfsConfig = {
      gatewayUrl: getRuntimeConfigValue('VITE_IPFS_GATEWAY'),
      apiUrl: getIpfsApiUrl(),
    }
    const twitterApiConfig = {
      platformApiBaseUrl: getRuntimeConfigValue('VITE_PLATFORM_API_URL') || 'http://localhost:3001',
      ethereumMainnetRpcUrl: getRuntimeConfigValue('VITE_MAINNET_RPC_URL'),
    }
    const eventCacheUrl = getEventCacheUrl()
    const contractAddresses = {
      beliefs: getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS') as `0x${string}`,
      implications: getRuntimeConfigValue('VITE_IMPLICATIONS_CONTRACT_ADDRESS') as `0x${string}`,
      assuranceContractFactory: getRuntimeConfigValue('VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS') as `0x${string}`,
      erc1155Factory: getRuntimeConfigValue('VITE_ERC1155_FACTORY_ADDRESS') as `0x${string}`,
      delegatableNotes: getRuntimeConfigValue('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS') as `0x${string}`,
      recurringPledges: getRuntimeConfigValue('VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS') as `0x${string}` | undefined,
      noteIntent: getRuntimeConfigValue('VITE_NOTE_INTENT_CONTRACT_ADDRESS') as `0x${string}`,
      alignmentAttestations: getRuntimeConfigValue('VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS') as `0x${string}`,
      mutableRefUpdater: getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}`,
      trustRegistry: getRuntimeConfigValue('VITE_TRUST_REGISTRY_CONTRACT_ADDRESS') as `0x${string}`,
      nudgePublications: getRuntimeConfigValue('VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS') as `0x${string}` | undefined,
      publishedData: getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS') as `0x${string}` | undefined,
      contentRegistry: getRuntimeConfigValue('VITE_CONTENT_REGISTRY_ADDRESS') as `0x${string}` | undefined,
      channelRegistry: getRuntimeConfigValue('VITE_CHANNEL_REGISTRY_ADDRESS') as `0x${string}` | undefined,
      channelEscrow: getRuntimeConfigValue('VITE_CHANNEL_ESCROW_ADDRESS') as `0x${string}` | undefined,
      creatorContractFactory: getRuntimeConfigValue('VITE_CREATOR_CONTRACT_FACTORY_ADDRESS') as `0x${string}` | undefined,
    }
    const configuredChainId = getRuntimeConfigValue('VITE_CHAIN_ID')
    const defaultChainId = configuredChainId ? Number(configuredChainId) : undefined
    const ethRpcUrl = getRuntimeConfigValue('VITE_ETH_RPC_URL')
    const publicClient = ethRpcUrl
      ? createPublicClient({ chain: chainForId(defaultChainId ?? hardhat.id), transport: http(ethRpcUrl) })
      : undefined
    const machinery = createSDKMachinery({
      ipfsConfig,
      twitterApiConfig,
      publicClient: publicClient as any,
      eventCacheUrl,
      contractAddresses,
    })
    return defaultChainId ? { ...machinery, defaultChainId } : machinery
  }, [])
}
