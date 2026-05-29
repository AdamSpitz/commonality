import type { DomainManifest, DomainId } from './types'
import { commonalityManifest } from './commonality/manifest.tsx'
import { lazyGivingManifest } from './lazyGiving/manifest.tsx'
import { alignmentManifest } from './alignment/manifest.tsx'
import { tallyManifest } from './tally/manifest.tsx'
import { contentFundingManifest } from './content-funding/manifest.tsx'
import { noninflammatoryManifest } from './noninflammatory/manifest.tsx'
import { csmManifest } from './csm/manifest.tsx'
import { conceptspaceManifest } from './conceptspace/manifest.tsx'

export * from './types'

export const domainManifests: Record<DomainId, DomainManifest> = {
  commonality: commonalityManifest,
  lazyGiving: lazyGivingManifest,
  alignment: alignmentManifest,
  tally: tallyManifest,
  'content-funding': contentFundingManifest,
  noninflammatory: noninflammatoryManifest,
  csm: csmManifest,
  conceptspace: conceptspaceManifest,
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
  if (envDomain === 'civility') return 'noninflammatory'
  if (envDomain === 'common-sense-majority') return 'csm'
  if (
    envDomain === 'commonality' ||
    envDomain === 'lazyGiving' ||
    envDomain === 'alignment' ||
    envDomain === 'tally' ||
    envDomain === 'content-funding' ||
    envDomain === 'noninflammatory' ||
    envDomain === 'csm' ||
    envDomain === 'conceptspace'
  ) {
    return envDomain
  }
  return 'commonality'
}

export { commonalityManifest }
export { lazyGivingManifest }
export { alignmentManifest }
export { tallyManifest }
export { contentFundingManifest }
export { noninflammatoryManifest }
export { csmManifest }
export { conceptspaceManifest }
