import {
  getDirectTrustMapping,
  getTrustedSet,
  type ContractAddresses,
  type DirectTrustMapping,
  type SDKMachinery,
} from '@commonality/sdk'
import type {
  SubjectivCachedDirectTrustMappings,
  SubjectivTrustedSetComputationResult,
  SubjectivTrustedSetProgressUpdate,
} from './subjectivTrust'

export interface ComputeSubjectivTrustedSetOptions {
  address: string
  eventCacheUrl: string
  contractAddresses: ContractAddresses
  cachedDirectTrustMappings?: SubjectivCachedDirectTrustMappings
  onProgress?: (update: SubjectivTrustedSetProgressUpdate) => void
}

function createSubjectivMachinery({
  eventCacheUrl,
  contractAddresses,
}: Omit<ComputeSubjectivTrustedSetOptions, 'address' | 'cachedDirectTrustMappings' | 'onProgress'>): SDKMachinery {
  return {
    indexerUrl: '',
    ipfsConfig: {},
    twitterApiConfig: { twitterApiDotIoApiKey: '' },
    testConfig: {},
    eventCacheUrl,
    contractAddresses,
  }
}

function deserializeDirectTrustMappings(
  cachedDirectTrustMappings?: SubjectivCachedDirectTrustMappings
): Map<string, DirectTrustMapping> {
  const directTrustCache = new Map<string, DirectTrustMapping>()

  if (!cachedDirectTrustMappings) {
    return directTrustCache
  }

  for (const [truster, entries] of Object.entries(cachedDirectTrustMappings)) {
    directTrustCache.set(
      truster.toLowerCase(),
      new Map(entries.map(({ trustee, score }) => [trustee.toLowerCase(), score]))
    )
  }

  return directTrustCache
}

function serializeDirectTrustMappings(
  directTrustCache: Map<string, DirectTrustMapping>
): SubjectivCachedDirectTrustMappings {
  return Object.fromEntries(
    Array.from(directTrustCache.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([truster, directTrustMapping]) => [
        truster,
        Array.from(directTrustMapping.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([trustee, score]) => ({ trustee, score })),
      ])
  )
}

export async function computeSubjectivTrustedSetResult(
  options: ComputeSubjectivTrustedSetOptions
): Promise<SubjectivTrustedSetComputationResult> {
  const normalizedAddress = options.address.toLowerCase()
  const machinery = createSubjectivMachinery(options)
  const directTrustCache = deserializeDirectTrustMappings(options.cachedDirectTrustMappings)

  const directTrust = await getDirectTrustMapping(machinery, normalizedAddress)
  directTrustCache.set(normalizedAddress, directTrust)

  if (directTrust.size === 0) {
    return {
      hasDirectTrust: false,
      trustedSet: [],
      directTrustMappings: serializeDirectTrustMappings(directTrustCache),
    }
  }

  const trustedSet = await getTrustedSet(machinery, normalizedAddress, {
    directTrustCache,
    onProgress: options.onProgress
      ? (mapping) => {
          options.onProgress?.({
            hasDirectTrust: true,
            trustedSet: Array.from(mapping.keys()),
          })
        }
      : undefined,
  })

  return {
    hasDirectTrust: true,
    trustedSet: Array.from(trustedSet),
    directTrustMappings: serializeDirectTrustMappings(directTrustCache),
  }
}
