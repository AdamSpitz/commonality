import { MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import {
  createDefaultDocumentStore,
  createDisplayableDocument,
  publishedDataCidForDocument,
  toCanonicalJson,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { getUserRef, updateRef } from '@commonality/sdk/mutable-refs'
import { publishData } from '@commonality/sdk/published-data'
import type { WriteClients } from '@commonality/sdk/utils'
import type { Abi } from 'viem'

export const DELEGATE_OFFERING_REF = 'delegate-offering'
export const DELEGATE_OFFERING_KIND = 'commonality.delegate-offering' as const
export const DELEGATE_OFFERING_VERSION = 1 as const

export interface DelegateOffering {
  statementCids: string[]
  summary: string
}

export function normalizeDelegateOffering(offering: DelegateOffering): DelegateOffering {
  return {
    statementCids: [...new Set(offering.statementCids.map((cid) => cid.trim()).filter(Boolean))],
    summary: offering.summary.trim().slice(0, 1000),
  }
}

export function buildDelegateOfferingDocument(offering: DelegateOffering): DisplayableDocument {
  const normalized = normalizeDelegateOffering(offering)
  const lines = ['# Delegate offering']
  if (normalized.summary) lines.push('', normalized.summary)
  lines.push('', '## Funding scopes', ...normalized.statementCids.map((cid) => `- ${cid}`))
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: lines.join('\n'),
    references: normalized.statementCids.map((cid) => ({ cid, label: 'funding-scope' })),
    extras: {
      kind: DELEGATE_OFFERING_KIND,
      version: DELEGATE_OFFERING_VERSION,
      statementCids: normalized.statementCids,
      summary: normalized.summary,
    },
  })
}

export function parseDelegateOfferingDocument(document: DisplayableDocument): DelegateOffering | null {
  const extras = document.extras
  if (!extras || extras.kind !== DELEGATE_OFFERING_KIND || extras.version !== DELEGATE_OFFERING_VERSION) return null
  if (!Array.isArray(extras.statementCids)) return null
  const statementCids = extras.statementCids.filter((cid): cid is string => typeof cid === 'string')
  const offering = normalizeDelegateOffering({
    statementCids,
    summary: typeof extras.summary === 'string' ? extras.summary : '',
  })
  return offering.statementCids.length > 0 ? offering : null
}

export function previewDelegateOfferingCid(offering: DelegateOffering): string {
  return publishedDataCidForDocument(buildDelegateOfferingDocument(offering))
}

export async function loadDelegateOffering(
  machinery: SDKMachinery,
  owner: string,
): Promise<{ cid: string; offering: DelegateOffering } | null> {
  const ref = await getUserRef(machinery, owner, DELEGATE_OFFERING_REF)
  const cid = ref?.value?.trim()
  if (!cid) return null
  const result = await createDefaultDocumentStore(machinery).read(cid as never)
  if (result.status !== 'active') return null
  const offering = parseDelegateOfferingDocument(result.document)
  return offering ? { cid, offering } : null
}

export async function publishDelegateOffering(
  machinery: SDKMachinery,
  clients: WriteClients,
  offering: DelegateOffering,
): Promise<string> {
  const normalized = normalizeDelegateOffering(offering)
  if (normalized.statementCids.length === 0) throw new Error('Choose at least one funding scope.')
  const publishedDataAddress = machinery.contractAddresses?.publishedData
  const mutableRefAddress = machinery.contractAddresses?.mutableRefUpdater
  if (!publishedDataAddress || !mutableRefAddress) throw new Error('Delegate publication contracts are not configured.')

  const document = buildDelegateOfferingDocument(normalized)
  const bytes = new TextEncoder().encode(toCanonicalJson(document))
  const publication = await publishData(clients, { address: publishedDataAddress, abi: PublishedDataAbi as Abi }, bytes)
  try {
    await updateRef(
      clients,
      { address: mutableRefAddress, abi: MutableRefUpdaterAbi as Abi },
      DELEGATE_OFFERING_REF,
      publication.cid,
    )
  } catch (error) {
    throw new Error(`The offering version was published as ${publication.cid}, but the public profile was not updated. Retry publishing to finish.`, { cause: error })
  }
  return publication.cid
}

export async function withdrawDelegateOffering(machinery: SDKMachinery, clients: WriteClients): Promise<void> {
  const mutableRefAddress = machinery.contractAddresses?.mutableRefUpdater
  if (!mutableRefAddress) throw new Error('Delegate publication contract is not configured.')
  await updateRef(
    clients,
    { address: mutableRefAddress, abi: MutableRefUpdaterAbi as Abi },
    DELEGATE_OFFERING_REF,
    '',
  )
}
