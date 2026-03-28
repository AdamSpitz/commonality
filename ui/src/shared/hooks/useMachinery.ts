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
    }
    // Event cache is served from the same origin as the Vite dev server (proxied to indexer)
    const eventCacheUrl = new URL(indexerUrl).origin
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
    }
    const ethRpcUrl = import.meta.env.VITE_ETH_RPC_URL
    const publicClient = ethRpcUrl
      ? createPublicClient({ chain: hardhat, transport: http(ethRpcUrl) })
      : undefined
    return createSDKMachinery(indexerUrl, ipfsConfig, undefined, publicClient, eventCacheUrl, contractAddresses)
  }, [])
}
