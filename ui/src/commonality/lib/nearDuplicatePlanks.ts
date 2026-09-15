/**
 * Rank statement texts the client already has. Not a cause directory.
 * See docs/founder/the-other-cause.md.
 */

export interface NearDuplicateCandidate {
  text: string
  cid?: string
  source: string
}

export interface NearDuplicateHit extends NearDuplicateCandidate {
  score: number
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  )
}

export function rankNearDuplicates(
  needle: string,
  candidates: NearDuplicateCandidate[],
  limit = 5,
): NearDuplicateHit[] {
  const want = tokens(needle)
  if (want.size === 0) return []
  const scored: NearDuplicateHit[] = []
  for (const candidate of candidates) {
    if (!candidate.text.trim()) continue
    if (candidate.text.trim() === needle.trim()) continue
    const have = tokens(candidate.text)
    if (have.size === 0) continue
    let overlap = 0
    for (const token of want) if (have.has(token)) overlap += 1
    const score = overlap / Math.max(want.size, have.size)
    if (score < 0.25) continue
    scored.push({ ...candidate, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}
