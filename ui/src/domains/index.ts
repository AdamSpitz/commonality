import type { DomainManifest, DomainId } from './types'
import { commonalityManifest } from './commonality/manifest.tsx'
import { lazyGivingManifest } from './lazy-giving/manifest.tsx'
import { alignmentManifest } from './alignment/manifest.tsx'
import { tallyManifest } from './tally/manifest.tsx'
import { contentFundingManifest } from './content-funding/manifest.tsx'
import { conceptspaceManifest } from './conceptspace/manifest.tsx'

export * from './types'

/** Brands this repo still builds. Civility and CSM are external sites. */
export type BuiltDomainId = Exclude<DomainId, 'civility' | 'common-sense-majority'>

export const domainManifests: Record<BuiltDomainId, DomainManifest> = {
  commonality: commonalityManifest,
  lazyGiving: lazyGivingManifest,
  alignment: alignmentManifest,
  tally: tallyManifest,
  'content-funding': contentFundingManifest,
  conceptspace: conceptspaceManifest,
}

export function getDomainManifest(domainId: BuiltDomainId): DomainManifest {
  return domainManifests[domainId]
}

export { commonalityManifest }
export { lazyGivingManifest }
export { alignmentManifest }
export { tallyManifest }
export { contentFundingManifest }
export { conceptspaceManifest }
