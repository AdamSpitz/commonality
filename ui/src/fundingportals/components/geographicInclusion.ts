import {
  parsePlacePath,
  type BoardInclusionRules,
  type GeographicBoardRule,
} from '@commonality/sdk/displayable-documents'

export type { BoardInclusionRules, GeographicBoardRule }
export { parsePlacePath, parseBoardInclusionRules } from '@commonality/sdk/displayable-documents'

function normalizedPart(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function parseRelevantAreas(value: unknown): string[][] | undefined {
  if (!Array.isArray(value)) return undefined
  const paths = value.slice(0, 20).map(parsePlacePath).filter((path): path is string[] => Boolean(path))
  return paths.length > 0 ? paths : undefined
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
  metadataDocumentPresent = true,
): boolean {
  const scope = rules?.geographic?.within
  if (!scope) return true
  // Rows with no project-metadata document (content-funding, still loading, fetch
  // failed) are not "outside" the board; only a resolved document can exclude.
  if (!metadataDocumentPresent) return true
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
