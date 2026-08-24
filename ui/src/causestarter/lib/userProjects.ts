import { getProject, getUserContributions, getUserCreatedProjects, type Project } from '@commonality/sdk/lazy-giving'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { loadProjectWithCache, projectFoldCacheOptions } from '@ui/shared'
import { readLazyGivingProjectMetadata } from '@ui/lazy-giving/metadata'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { mapWithConcurrency, PLANK_QUERY_CONCURRENCY } from './concurrency'
import { listProjectBookmarks } from './projectBookmarks'

export type ProjectRelation = 'created' | 'contributed' | 'bookmarked'

export interface UserProject {
  project: Project
  title: string
  relations: ProjectRelation[]
}

function normalizeAddress(value: string): string | null {
  const address = value.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null
  return address
}

async function createdProjectAddresses(
  machinery: SDKMachinery,
  userAddress: string,
): Promise<string[]> {
  try {
    const addresses = await getUserCreatedProjects(machinery, userAddress)
    return addresses
      .map((address) => normalizeAddress(address))
      .filter((address): address is string => Boolean(address))
  } catch {
    return []
  }
}

function projectTitle(project: Project, metadataName?: string): string {
  if (metadataName?.trim()) return metadataName.trim()
  return `Project ${project.id.slice(0, 10)}…`
}

export async function loadUserProjects(
  machinery: SDKMachinery,
  userAddress: string | undefined,
): Promise<UserProject[]> {
  const created = new Set<string>()
  const contributed = new Set<string>()
  const bookmarked = new Set(listProjectBookmarks())

  if (userAddress) {
    const [createdAddresses, contributions] = await Promise.all([
      createdProjectAddresses(machinery, userAddress),
      getUserContributions(machinery, userAddress).catch(() => []),
    ])
    for (const address of createdAddresses) created.add(address)
    for (const contribution of contributions) {
      const address = normalizeAddress(contribution.projectAddress)
      if (address) contributed.add(address)
    }
  }

  const ids = [...new Set([...created, ...contributed, ...bookmarked])]
  const cacheOptions = projectFoldCacheOptions(machinery)
  const loaded = await mapWithConcurrency(ids, PLANK_QUERY_CONCURRENCY, async (id) => {
    const project = (
      cacheOptions
        ? await loadProjectWithCache(machinery, id, cacheOptions).catch(() => null)
        : await getProject(machinery, id).catch(() => null)
    )
    if (!project) return null
    let name: string | undefined
    if (project.metadataCid) {
      const metadata = await readLazyGivingProjectMetadata(
        machinery,
        project.metadataCid as IpfsCidV1,
      ).catch(() => null)
      name = metadata?.name
    }
    const relations: ProjectRelation[] = []
    if (created.has(id)) relations.push('created')
    if (contributed.has(id)) relations.push('contributed')
    if (bookmarked.has(id)) relations.push('bookmarked')
    return {
      project,
      title: projectTitle(project, name),
      relations,
    } satisfies UserProject
  })

  return loaded.filter((row): row is UserProject => row !== null)
}
