import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import type { Currency } from '@commonality/sdk/utils'
import type { ContentAttestationInfo } from './hooks/useContentFundingState'

export interface AlignedContentContract {
  contractAddress: string
  viaStatementCids: string[]
  alignedItemCount: number
  contentItemCount: number
  totalReceived: string
  threshold: string
  deadline: string
  fundingCurrency: Currency | undefined
}

function alignedItemsForStatements(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCids: readonly string[],
): { contractAddress: string; statementCids: string[] }[] {
  const wanted = new Set(statementCids.filter(Boolean))
  if (wanted.size === 0) return []

  const rows: { contractAddress: string; statementCids: string[] }[] = []
  const seen = new Set<string>()

  for (const channel of channels) {
    for (const contract of channel.contracts) {
      for (const item of contract.contentItems) {
        const matches = (attestations.get(item.canonicalId) ?? [])
          .filter((attestation) => attestation.attested && wanted.has(attestation.statementCid))
          .map((attestation) => attestation.statementCid)
        if (matches.length === 0) continue
        const key = `${item.canonicalId}:${contract.contractAddress}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
          contractAddress: contract.contractAddress,
          statementCids: [...new Set(matches)],
        })
      }
    }
  }
  return rows
}

/** One row per contract that contains at least one aligned content item. */
export function selectAlignedContentContracts(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCids: readonly string[],
): AlignedContentContract[] {
  const items = alignedItemsForStatements(channels, attestations, statementCids)
  const byAddress = new Map<string, AlignedContentContract>()

  for (const item of items) {
    const key = item.contractAddress.toLowerCase()
    const existing = byAddress.get(key)
    if (existing) {
      existing.alignedItemCount += 1
      for (const cid of item.statementCids) {
        if (!existing.viaStatementCids.includes(cid)) existing.viaStatementCids.push(cid)
      }
      continue
    }

    let contentItemCount = 0
    let totalReceived = '0'
    let threshold = '0'
    let deadline = '0'
    let fundingCurrency: Currency | undefined
    for (const channel of channels) {
      const contract = channel.contracts.find(
        (entry) => entry.contractAddress.toLowerCase() === key,
      )
      if (!contract) continue
      contentItemCount = contract.contentItems.length
      if (contract.project) {
        totalReceived = contract.project.totalReceived
        threshold = contract.project.threshold
        deadline = contract.project.deadline
        fundingCurrency = contract.project.fundingCurrency
      }
      break
    }

    byAddress.set(key, {
      contractAddress: item.contractAddress,
      viaStatementCids: [...item.statementCids],
      alignedItemCount: 1,
      contentItemCount,
      totalReceived,
      threshold,
      deadline,
      fundingCurrency,
    })
  }

  return [...byAddress.values()]
}
