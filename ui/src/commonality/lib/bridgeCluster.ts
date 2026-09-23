/** Publish a bridge cluster. The document format lives in `@commonality/sdk/displayable-documents`. */

import {
  MutableRefUpdaterAbi,
  PublishedDataAbi,
} from '@commonality/sdk/abis'
import {
  buildClusterDocument,
  createDefaultDocumentStore,
  parseClusterDocument,
  publishedDataCidForDocument,
  toCanonicalJson,
  validateClusterFields,
  validateDisplayableDocument,
  type BridgeClusterFields,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { getUserRef } from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { toHex } from 'viem'
import { getRuntimeConfigValue } from '../../shared'
import {
  parseCauseRouteParams,
  sendCallsPreferAtomic,
  validateSlug,
  type ContractCall,
  type StableCauseId,
} from './causeRoster'

export {
  BRIDGE_CLUSTER_KIND,
  BRIDGE_CLUSTER_SCHEMA_VERSION,
  attestablePairs,
  buildClusterDocument,
  nudgeTargets,
  parseCauseRef,
  parseClusterDocument,
  previewClusterCid,
  renderClusterContent,
  validateClusterFields,
} from '@commonality/sdk/displayable-documents'
export type {
  BridgeClusterExtras,
  BridgeClusterFields,
  CauseRef,
  ImplicationPairRole,
  IntendedPair,
  ModifiedCauseRef,
} from '@commonality/sdk/displayable-documents'

export interface PublishClusterResult {
  clusterCid: string
  refTxHash: `0x${string}`
  publishTxHash: `0x${string}`
  batched: boolean
}

export function stableClusterPath(id: StableCauseId, versionCid?: string): string {
  const base = `/bridge/${id.owner}/${encodeURIComponent(id.slug)}`
  return versionCid ? `${base}@${versionCid}` : base
}

export function parseClusterRouteParams(
  owner: string | undefined,
  slugPart: string | undefined,
): { owner: `0x${string}`; slug: string; versionCid?: string } | null {
  return parseCauseRouteParams(owner, slugPart)
}

function contractsFromMachinery(machinery: SDKMachinery) {
  const addresses = machinery.contractAddresses
  const mutableRefAddress = (addresses?.mutableRefUpdater
    || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const publishedDataAddress = (addresses?.publishedData
    || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  return { mutableRefAddress, publishedDataAddress }
}

export async function publishCluster(args: {
  machinery: SDKMachinery
  writeClients: WriteClients | null | undefined
  slug: string
  fields: BridgeClusterFields
}): Promise<PublishClusterResult> {
  const { machinery, writeClients, slug, fields } = args
  const slugError = validateSlug(slug)
  if (slugError) throw new Error(slugError)
  if (!writeClients) {
    throw new Error('Wallet is not ready. Connect your wallet and try again.')
  }
  const problem = validateClusterFields(fields)
  if (problem) throw new Error(problem)

  const { mutableRefAddress, publishedDataAddress } = contractsFromMachinery(machinery)
  if (!mutableRefAddress || !publishedDataAddress) {
    throw new Error('Contract addresses are missing. Redeploy Commonality to refresh config.json.')
  }

  const doc = buildClusterDocument(fields)
  const validation = validateDisplayableDocument(doc)
  if (!validation.valid) {
    throw new Error(`Invalid cluster document: ${validation.errors.join(', ')}`)
  }
  const content = new TextEncoder().encode(toCanonicalJson(doc))
  const clusterCid = publishedDataCidForDocument(doc)

  const calls: ContractCall[] = [
    {
      to: publishedDataAddress,
      abi: PublishedDataAbi as never,
      functionName: 'publishData',
      args: [toHex(content)],
    },
    {
      to: mutableRefAddress,
      abi: MutableRefUpdaterAbi as never,
      functionName: 'updateRef',
      args: [slug, clusterCid],
    },
  ]

  const { hashes, batched } = await sendCallsPreferAtomic(writeClients, calls)
  if (batched) {
    const hash = hashes[0]!
    return { clusterCid, publishTxHash: hash, refTxHash: hash, batched: true }
  }
  return {
    clusterCid,
    publishTxHash: hashes[0]!,
    refTxHash: hashes[1]!,
    batched: false,
  }
}

export async function resolveClusterCid(
  machinery: SDKMachinery,
  owner: string,
  slug: string,
): Promise<string | null> {
  const ref = await getUserRef(machinery, owner, slug)
  const value = ref?.value?.trim()
  return value || null
}

export async function loadClusterDocument(
  machinery: SDKMachinery,
  clusterCid: string,
): Promise<{ document: DisplayableDocument; fields: BridgeClusterFields } | null> {
  const store = createDefaultDocumentStore(machinery)
  const read = await store.read(clusterCid as never)
  if (read.status !== 'active') return null
  const fields = parseClusterDocument(read.document)
  if (!fields) return null
  return { document: read.document, fields }
}
