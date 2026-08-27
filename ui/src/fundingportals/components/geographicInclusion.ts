export interface GeographicBoardRule {
  /** Specific-to-broad place path, e.g. ["Ontario", "Canada"]. */
  within: string[]
}

export type BoardInclusionRules = {
  geographic?: GeographicBoardRule
}

function normalizedPart(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function parsePlacePath(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    const parts = value.split(',').slice(0, 8).map((part) => part.trim().slice(0, 120)).filter(Boolean)
    return parts.length > 0 ? parts : undefined
  }
  if (!Array.isArray(value)) return undefined
  const parts = value.slice(0, 8).filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim().slice(0, 120)).filter(Boolean)
  return parts.length > 0 ? parts : undefined
}

export function parseRelevantAreas(value: unknown): string[][] | undefined {
  if (!Array.isArray(value)) return undefined
  const paths = value.slice(0, 20).map(parsePlacePath).filter((path): path is string[] => Boolean(path))
  return paths.length > 0 ? paths : undefined
}

export function parseBoardInclusionRules(value: unknown): BoardInclusionRules | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const geographic = (value as Record<string, unknown>).geographic
  if (!geographic || typeof geographic !== 'object' || Array.isArray(geographic)) return undefined
  const within = parsePlacePath((geographic as Record<string, unknown>).within)
  return within ? { geographic: { within } } : undefined
}

function endsWithPath(candidate: string[], scope: string[]): boolean {
  if (scope.length > candidate.length) return false
  const offset = candidate.length - scope.length
  return scope.every((part, index) => normalizedPart(part) === normalizedPart(candidate[offset + index]!))
}

/**
 * Geographic matching is deliberately modest: project creators publish one or more
 * specific-to-broad place paths and a scoped board matches a containing suffix.
 * "Worldwide" is explicit and relevant to every geographic board.
 */
export function projectMatchesBoardRules(
  relevantAreas: readonly string[][] | undefined,
  rules: BoardInclusionRules | undefined,
): boolean {
  const scope = rules?.geographic?.within
  if (!scope) return true
  if (!relevantAreas?.length) return false
  return relevantAreas.some((area) =>
    area.length === 1 && normalizedPart(area[0]!) === 'worldwide'
      ? true
      : endsWithPath(area, scope),
  )
}

export function formatPlacePath(path: readonly string[]): string {
  return path.join(', ')
}
