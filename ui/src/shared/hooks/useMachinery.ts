import { useMemo } from 'react'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk'

export function useMachinery(): SDKMachinery {
  return useMemo(() => {
    const indexerUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'
    const ipfsConfig = {
      gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY,
      apiUrl: import.meta.env.VITE_IPFS_API,
    }
    return createSDKMachinery(indexerUrl, ipfsConfig)
  }, [])
}
