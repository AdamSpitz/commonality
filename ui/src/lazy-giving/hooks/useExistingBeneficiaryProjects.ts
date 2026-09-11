import { useEffect, useMemo, useState } from 'react'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { getEventCacheUrl, getRuntimeConfigValue, useCachedProjects, useMachinery } from '../../shared'
import { loadDisplayDenylist } from '../../shared'
import { readLazyGivingProjectMetadata, type ProjectMetadata } from '../metadata'
import { canonicalDnsOrNull, projectsForBeneficiary, type BeneficiaryProjectMatch } from '../projectsForBeneficiary'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export function useExistingBeneficiaryProjects(domainInput: string): {
  loading: boolean
  matches: BeneficiaryProjectMatch[]
  canonical: string | null
} {
  const canonical = useMemo(() => canonicalDnsOrNull(domainInput), [domainInput])
  const machinery = useMachinery()
  const cacheOptions = useMemo(() => ({
    eventCacheUrl: getEventCacheUrl(),
    contractAddresses: {
      assuranceContractFactory: (getRuntimeConfigValue('VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS') ??
        ZERO_ADDRESS) as `0x${string}`,
    },
    foldType: 'project' as const,
  }), [])
  const { projects, loading: projectsLoading } = useCachedProjects({
    cacheOptions,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  })
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})
  const [metadataLoading, setMetadataLoading] = useState(false)

  useEffect(() => {
    if (!canonical) {
      setMetadata({})
      return
    }
    let cancelled = false
    const load = async () => {
      setMetadataLoading(true)
      const displayDenylist = await loadDisplayDenylist()
      const entries = await Promise.all(
        projects
          .filter((project) => project.metadataCid)
          .map(async (project) => {
            try {
              const data = await readLazyGivingProjectMetadata(
                machinery,
                project.metadataCid! as IpfsCidV1,
                displayDenylist,
              )
              return { id: project.id, data }
            } catch {
              return { id: project.id, data: null }
            }
          }),
      )
      if (cancelled) return
      const next: Record<string, ProjectMetadata> = {}
      for (const { id, data } of entries) {
        if (data) next[id] = data
      }
      setMetadata(next)
      setMetadataLoading(false)
    }
    load().catch(() => {
      if (!cancelled) setMetadataLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [canonical, machinery, projects])

  const matches = useMemo(() => {
    if (!canonical) return []
    return projectsForBeneficiary(projects, metadata, 'dns', canonical)
  }, [canonical, metadata, projects])

  return {
    loading: Boolean(canonical) && (projectsLoading || metadataLoading),
    matches,
    canonical,
  }
}
