import type { AlignedProjectFunding } from '@commonality/sdk/fundingportals'
import { ETH_CURRENCY } from '@commonality/sdk/utils'
import type { AlignedContentContract } from '../../content-funding'

/** Funding-foldable fields from either LazyGiving alignment or a content contract. */
export type FundingProjectRow = Pick<
  AlignedProjectFunding,
  'projectAddress' | 'fundingCurrency' | 'totalReceived' | 'threshold' | 'deadline'
>

/**
 * Deduped union of LazyGiving-aligned projects and attested content-funding
 * contracts. Same address stays one row (LazyGiving numbers win).
 */
export function unionAlignedFundingProjects(
  lazyGiving: readonly FundingProjectRow[],
  contentContracts: readonly AlignedContentContract[],
): AlignedProjectFunding[] {
  const byAddress = new Map<string, AlignedProjectFunding>()

  for (const project of lazyGiving) {
    byAddress.set(project.projectAddress.toLowerCase(), {
      projectAddress: project.projectAddress,
      fundingCurrency: project.fundingCurrency,
      totalReceived: project.totalReceived,
      threshold: project.threshold,
      deadline: project.deadline,
    })
  }

  for (const contract of contentContracts) {
    const key = contract.contractAddress.toLowerCase()
    if (byAddress.has(key)) continue
    byAddress.set(key, {
      projectAddress: contract.contractAddress,
      fundingCurrency: contract.fundingCurrency ?? ETH_CURRENCY,
      totalReceived: contract.totalReceived,
      threshold: contract.threshold,
      deadline: contract.deadline,
    })
  }

  return [...byAddress.values()]
}
