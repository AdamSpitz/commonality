/**
 * Parent → modified nudge batches for a published bridge cluster.
 *
 * Nudge path is parent-signer → modified wording. That is the inverse of a
 * modified→parent implication pair. Do not invent pairs that were not recorded.
 */

import { NudgePublicationsAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import {
  computePublishedDataId,
  publishedDataIdToCid,
} from '@commonality/sdk/published-data'
import { cidToBytes32, type WriteClients } from '@commonality/sdk/utils'
import { toHex } from 'viem'
import type { BridgeClusterFields, IntendedPair } from './bridgeCluster'
import { sendCallsPreferAtomic } from './causeRoster'
import { getRuntimeConfigValue } from './runtimeConfig'

export interface ParentToModifiedNudge {
  targetStatementCid: string
  suggestedStatementCid: string
  reason: string
  confidence: number
}

export function parentToModifiedNudges(pairs: IntendedPair[]): ParentToModifiedNudge[] {
  return pairs
    .filter((pair) => pair.role === 'modified-to-parent')
    .map((pair) => ({
      targetStatementCid: pair.toCid,
      suggestedStatementCid: pair.fromCid,
      reason: 'Mediator wording of your side. Signing it still implies the parent plank.',
      confidence: 0.8,
    }))
}

export function buildNudgeBatchDocument(args: {
  nudger: `0x${string}`
  nudges: ParentToModifiedNudge[]
  publishedAt?: number
}): Record<string, unknown> {
  return {
    kind: 'nudge-batch',
    schemaVersion: 1,
    nudger: args.nudger.toLowerCase(),
    publishedAt: args.publishedAt ?? Math.floor(Date.now() / 1000),
    nudges: args.nudges,
    revocations: [],
  }
}

export async function publishNudgeBatch(args: {
  writeClients: WriteClients
  mediatorAddress: `0x${string}`
  nudges: ParentToModifiedNudge[]
}): Promise<{ batchCid: string; txHash: `0x${string}` }> {
  if (args.nudges.length === 0) {
    throw new Error('Add parent→modified pairs first. We will not invent them.')
  }
  const publishedDataAddress = getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS') as `0x${string}` | undefined
  const nudgePublicationsAddress = getRuntimeConfigValue('VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS') as `0x${string}` | undefined
  if (!publishedDataAddress || !nudgePublicationsAddress) {
    throw new Error('Nudge publication contracts are missing. Redeploy CauseStarter to refresh config.json.')
  }

  const document = buildNudgeBatchDocument({
    nudger: args.mediatorAddress,
    nudges: args.nudges,
  })
  const content = new TextEncoder().encode(JSON.stringify(document))
  const batchCid = publishedDataIdToCid(computePublishedDataId(content))

  const { hashes } = await sendCallsPreferAtomic(args.writeClients, [
    {
      to: publishedDataAddress,
      abi: PublishedDataAbi as never,
      functionName: 'publishData',
      args: [toHex(content)],
    },
    {
      to: nudgePublicationsAddress,
      abi: NudgePublicationsAbi as never,
      functionName: 'publishNudgeBatch',
      args: [cidToBytes32(batchCid)],
    },
  ])

  return { batchCid, txHash: hashes[hashes.length - 1]! }
}

export async function publishParentToModifiedNudges(args: {
  writeClients: WriteClients
  mediatorAddress: `0x${string}`
  fields: BridgeClusterFields
}): Promise<{ batchCid: string; txHash: `0x${string}` }> {
  const nudges = parentToModifiedNudges(args.fields.pairs)
  if (nudges.length === 0) {
    throw new Error('Add modified→parent pairs first. Nudges are parent-signer → modified plank, and we will not invent them.')
  }
  return publishNudgeBatch({
    writeClients: args.writeClients,
    mediatorAddress: args.mediatorAddress,
    nudges,
  })
}
