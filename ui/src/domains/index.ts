import type { DomainManifest, DomainId } from './types'
import { commonalityManifest } from './commonality/manifest.tsx'
import { contentFundingManifest } from './content-funding/manifest.tsx'
import { noninflammatoryManifest } from './noninflammatory/manifest.tsx'
import { movementManifest } from './movement/manifest.tsx'

export * from './types'

export const domainManifests: Record<DomainId, DomainManifest> = {
  commonality: commonalityManifest,
  'content-funding': contentFundingManifest,
  noninflammatory: noninflammatoryManifest,
  movement: movementManifest,
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
  if (
    envDomain === 'commonality' ||
    envDomain === 'content-funding' ||
    envDomain === 'noninflammatory' ||
    envDomain === 'movement'
  ) {
    return envDomain
  }
  return 'commonality'
}

export { commonalityManifest }
export { contentFundingManifest }
export { noninflammatoryManifest }
export { movementManifest }
