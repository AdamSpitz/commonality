import type { DomainManifest, DomainId } from './types'
import { commonalityManifest } from './commonality/manifest.tsx'
import { lazyGivingManifest } from './lazy-giving/manifest.tsx'
import { alignmentManifest } from './alignment/manifest.tsx'
import { tallyManifest } from './tally/manifest.tsx'
import { contentFundingManifest } from './content-funding/manifest.tsx'
import { civilityManifest } from './civility/manifest.tsx'
import { commonSenseMajorityManifest } from './common-sense-majority/manifest.tsx'
import { conceptspaceManifest } from './conceptspace/manifest.tsx'
import { causestarterManifest } from './causestarter/manifest.tsx'

export * from './types'

export const domainManifests: Record<DomainId, DomainManifest> = {
  commonality: commonalityManifest,
  lazyGiving: lazyGivingManifest,
  alignment: alignmentManifest,
  tally: tallyManifest,
  'content-funding': contentFundingManifest,
  civility: civilityManifest,
  'common-sense-majority': commonSenseMajorityManifest,
  conceptspace: conceptspaceManifest,
  causestarter: causestarterManifest,
}

export function getDomainManifest(domainId: DomainId): DomainManifest {
  return domainManifests[domainId]
}

export function getActiveDomain(): DomainManifest {
  const domainId = getDomainIdFromEnv()
  return domainManifests[domainId]
}

function getDomainIdFromEnv(): DomainId {
  const envDomain = import.meta.env.VITE_DOMAIN
  if (envDomain in domainManifests) return envDomain as DomainId
  return 'commonality'
}

export { commonalityManifest }
export { lazyGivingManifest }
export { alignmentManifest }
export { tallyManifest }
export { contentFundingManifest }
export { civilityManifest }
export { commonSenseMajorityManifest }
export { conceptspaceManifest }
export { causestarterManifest }
