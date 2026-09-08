import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk/machinery'
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node'
import { loadMcpConfig } from './config.js'

let cached: SDKMachinery | undefined

export function getMachinery(): SDKMachinery {
  if (cached) return cached
  const config = loadMcpConfig()
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(config.rpcUrl),
  })
  cached = createSDKMachinery({
    ipfsConfig: createIPFSConfigInNodeJSFromTheUsualEnvVars(),
    publicClient,
    eventCacheUrl: config.eventCacheUrl,
    contractAddresses: config.contractAddresses,
  })
  return cached
}

export function resetMachineryForTests(): void {
  cached = undefined
}
