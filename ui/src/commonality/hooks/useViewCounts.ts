/**
 * Believer sets for a cause's published planks, folded into view counts.
 *
 * The sets are fetched once per plank and cached here; selecting or
 * deselecting a plank re-folds locally and costs nothing, because a view is a
 * set operation rather than a query. See
 * `docs/founder/shaping-your-cause-statements.md` § Planks, views, anchors.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  computeViewCounts,
  type StatementBelieverSets,
  type ViewCounts,
} from '@commonality/sdk/conceptspace'
import { invalidateBelieverSets, loadBelieverSets } from '../lib/believerSetsCache'
import { mapWithConcurrency, PLANK_QUERY_CONCURRENCY } from '../lib/concurrency'
import { useMachinery } from '../../shared'

export interface UseViewCountsResult {
  /** Folded counts over `selectedCids`, or undefined until sets have loaded. */
  counts: ViewCounts | undefined
  /** Per-plank supporter totals, for the transparency strip on each row. */
  perPlank: Map<string, { direct: number; indirect: number; total: number }>
  loading: boolean
  error: string | null
  refresh: () => void
}

function summarize(sets: StatementBelieverSets) {
  const total = new Set(sets.directBelieverIds)
  for (const id of sets.indirectBelieverIds) total.add(id)
  return {
    direct: sets.directBelieverIds.size,
    indirect: sets.indirectBelieverIds.size,
    // Direct and indirect overlap, so this is a union rather than a sum.
    total: total.size,
  }
}

export function useViewCounts(
  publishedCids: string[],
  selectedCids: string[],
  trustedImplicationAttesters?: Iterable<string>,
  enabled = true,
): UseViewCountsResult {
  const machinery = useMachinery()
  const [setsByCid, setSetsByCid] = useState<Map<string, StatementBelieverSets>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  // Primitive key so the effect doesn't refire on array identity alone.
  const publishedKey = publishedCids.join('\0')
  const trustedAttestersKey = trustedImplicationAttesters
    ? [...trustedImplicationAttesters].map((address) => address.toLowerCase()).sort().join('\0')
    : ''
  const generationRef = useRef(0)

  // Refresh means "I want newer numbers", so it has to drop the cached sets as
  // well as retrigger the effect; otherwise the cache would serve the same
  // answer straight back for the rest of its TTL.
  const refresh = useCallback(() => {
    invalidateBelieverSets(publishedKey ? publishedKey.split('\0').filter(Boolean) : undefined)
    setTick((n) => n + 1)
  }, [publishedKey])

  useEffect(() => {
    const cids = publishedKey ? publishedKey.split('\0').filter(Boolean) : []
    if (cids.length === 0) {
      setSetsByCid(new Map())
      setLoading(false)
      setError(null)
      return
    }
    // Keep prior counts when temporarily disabled (e.g. trust gate re-check) so
    // the cause page does not blank the views strip on every refresh.
    if (!enabled) {
      setLoading(false)
      return
    }

    // Generation guards against an older fetch resolving last; `cancelled`
    // covers unmount and dependency changes.
    const generation = ++generationRef.current
    let cancelled = false
    const isStale = () => cancelled || generation !== generationRef.current
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const results = await mapWithConcurrency(
          cids,
          PLANK_QUERY_CONCURRENCY,
          async (cid) => [
            cid,
            await loadBelieverSets(
              machinery,
              cid,
              trustedAttestersKey ? trustedAttestersKey.split('\0') : undefined,
              trustedAttestersKey,
            ),
          ] as const,
        )
        if (isStale()) return
        setSetsByCid(new Map(results))
      } catch (err) {
        if (isStale()) return
        setSetsByCid(new Map())
        setError(err instanceof Error ? err.message : 'Could not load supporter counts')
      } finally {
        if (!isStale()) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [machinery, publishedKey, tick, trustedAttestersKey, enabled])

  const selectedKey = selectedCids.join('\0')
  const counts = useMemo(() => {
    const cids = selectedKey ? selectedKey.split('\0').filter(Boolean) : []
    const sets = cids
      .map((cid) => setsByCid.get(cid))
      .filter((entry): entry is StatementBelieverSets => Boolean(entry))
    if (sets.length === 0 || sets.length !== cids.length) return undefined
    return computeViewCounts(sets)
  }, [selectedKey, setsByCid])

  const perPlank = useMemo(() => {
    const summary = new Map<string, { direct: number; indirect: number; total: number }>()
    for (const [cid, sets] of setsByCid) summary.set(cid, summarize(sets))
    return summary
  }, [setsByCid])

  return { counts, perPlank, loading, error, refresh }
}
