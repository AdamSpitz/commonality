/**
 * Operator-side chain writes for roster coherence badges.
 * msg.sender is the CauseStarter site operator key, never the founder.
 */

import { AlignmentAttestationsAbi } from '@commonality/sdk/abis'
import { attestAlignment } from '@commonality/sdk/fundingportals'
import {
  cidToBytes32,
  createWriteClients,
  type WriteClients,
} from '@commonality/sdk/utils'
import { classifyBlockchainError } from '@commonality/attester-core'
import {
  ROSTER_COHERENCE_CLAIM,
  ROSTER_COHERENCE_TOPIC,
  rosterSubjectId,
} from './coherenceClaim.js'
import type { CauseAssistConfig } from './types.js'

export type CoherenceChainConfig = Pick<
  CauseAssistConfig,
  'ethereumPrivateKey' | 'ethereumRpcUrl' | 'alignmentAttestationsContractAddress'
>

function requireChainConfig(config: CoherenceChainConfig): {
  privateKey: `0x${string}`
  rpcUrl: string
  alignmentAddress: `0x${string}`
} {
  if (!config.ethereumPrivateKey?.trim()) {
    throw new Error('Coherence attester private key is not configured')
  }
  if (!config.ethereumRpcUrl?.trim()) {
    throw new Error('Ethereum RPC URL is not configured for coherence attestation')
  }
  if (!config.alignmentAttestationsContractAddress?.trim()) {
    throw new Error('AlignmentAttestations contract address is not configured')
  }
  return {
    privateKey: config.ethereumPrivateKey as `0x${string}`,
    rpcUrl: config.ethereumRpcUrl,
    alignmentAddress: config.alignmentAttestationsContractAddress as `0x${string}`,
  }
}

export function isCoherenceAttesterConfigured(config: CoherenceChainConfig): boolean {
  return Boolean(
    config.ethereumPrivateKey?.trim()
    && config.ethereumRpcUrl?.trim()
    && config.alignmentAttestationsContractAddress?.trim(),
  )
}

export function getCoherenceAttesterAddress(config: CoherenceChainConfig): `0x${string}` | null {
  if (!config.ethereumPrivateKey?.trim()) return null
  try {
    const clients = createWriteClients(
      config.ethereumPrivateKey as `0x${string}`,
      config.ethereumRpcUrl || 'http://127.0.0.1:8545',
    )
    return clients.account
  } catch {
    return null
  }
}

function clientsFor(config: CoherenceChainConfig): {
  writeClients: WriteClients
  alignmentAddress: `0x${string}`
} {
  try {
    const { privateKey, rpcUrl, alignmentAddress } = requireChainConfig(config)
    return {
      writeClients: createWriteClients(privateKey, rpcUrl),
      alignmentAddress,
    }
  } catch (error) {
    throw classifyBlockchainError(error)
  }
}

/** True when this operator already attested the well-known claim for the roster CID. */
async function hasCoherenceAttestation(
  writeClients: WriteClients,
  alignmentAddress: `0x${string}`,
  rosterCid: string,
): Promise<boolean> {
  const result = await writeClients.publicClient.readContract({
    address: alignmentAddress,
    abi: AlignmentAttestationsAbi,
    functionName: 'hasAttestation',
    args: [
      writeClients.account,
      cidToBytes32(ROSTER_COHERENCE_TOPIC),
      rosterSubjectId(rosterCid),
      cidToBytes32(ROSTER_COHERENCE_CLAIM),
    ],
  })
  return result === true
}

/**
 * Positive-only: write AlignmentAttestations.attestAlignment for the roster CID.
 * Caller must only invoke after a coherent judgment for the same payload.
 */
export async function publishCoherenceAttestation(
  config: CoherenceChainConfig,
  rosterCid: string,
): Promise<{
  attesterAddress: `0x${string}`
  alreadyAttested: boolean
  txHash?: `0x${string}`
}> {
  const { writeClients, alignmentAddress } = clientsFor(config)
  const attesterAddress = writeClients.account

  try {
    if (await hasCoherenceAttestation(writeClients, alignmentAddress, rosterCid)) {
      return { attesterAddress, alreadyAttested: true }
    }

    const txHash = await attestAlignment(
      writeClients,
      { address: alignmentAddress, abi: AlignmentAttestationsAbi },
      rosterSubjectId(rosterCid),
      ROSTER_COHERENCE_CLAIM,
      ROSTER_COHERENCE_TOPIC,
    )
    return { txHash, attesterAddress, alreadyAttested: false }
  } catch (error) {
    throw classifyBlockchainError(error)
  }
}
