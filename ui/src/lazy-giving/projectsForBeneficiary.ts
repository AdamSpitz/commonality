import { normalizeDnsBeneficiary } from '@commonality/sdk/content-funding'
import type { ProjectMetadata } from './metadata'

export type BeneficiaryProjectMatch = {
  id: string
  name?: string
  description?: string
}

export function canonicalDnsOrNull(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    return normalizeDnsBeneficiary(trimmed)
  } catch {
    return null
  }
}

export function matchesBeneficiary(
  metadata: ProjectMetadata | undefined,
  namespace: string,
  canonicalIdentifier: string,
): boolean {
  const beneficiary = metadata?.beneficiary
  if (!beneficiary?.namespace || !beneficiary.canonicalIdentifier) return false
  return (
    beneficiary.namespace.toLowerCase() === namespace.toLowerCase()
    && beneficiary.canonicalIdentifier.toLowerCase() === canonicalIdentifier.toLowerCase()
  )
}

export function projectsForBeneficiary(
  projects: Array<{ id: string }>,
  metadataById: Record<string, ProjectMetadata | undefined>,
  namespace: string,
  canonicalIdentifier: string,
): BeneficiaryProjectMatch[] {
  const matches: BeneficiaryProjectMatch[] = []
  for (const project of projects) {
    const metadata = metadataById[project.id]
    if (!matchesBeneficiary(metadata, namespace, canonicalIdentifier)) continue
    matches.push({
      id: project.id,
      name: metadata?.name,
      description: metadata?.description,
    })
  }
  return matches
}

export function proposeProjectPath(options?: {
  statementCid?: string | null
  beneficiary?: string | null
}): string {
  const params = new URLSearchParams()
  if (options?.statementCid) params.set('statement', options.statementCid)
  if (options?.beneficiary) params.set('beneficiary', options.beneficiary)
  const query = params.toString()
  return query ? `/projects/new?${query}` : '/projects/new'
}
