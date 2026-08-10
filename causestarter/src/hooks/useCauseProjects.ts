/**
 * Projects aligned with a cause's planks.
 *
 * Alignment attestations attach to a *statement*, never to a cause — so a
 * cause's project list is the union of its planks' lists, and this asks each
 * plank separately. A project aligned with two planks is still one project:
 * it is deduped by address and remembers which planks it came from, so the
 * page can say which statement someone actually vouched for.
 *
 * Attaching low and aggregating high is the rule, not a preference: a project
 * aligned with a plank propagates up every implication arrow that plank has,
 * while one aligned with a conjunction appears on exactly one board. See
 * `docs/founder/shaping-your-cause-statements.md` § Align low, aggregate high.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  foldAlignedProjectFunding,
  getAllAlignedProjectsForCause,
  type AlignedProjectFundingTotals,
} from '@commonality/sdk/fundingportals'
import type { Currency, IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../lib/useMachinery'

export interface CauseProject {
  projectAddress: string
  fundingCurrency: Currency
  totalReceived: string
  threshold: string
  deadline: string
  /** CIDs of the planks this project was attested as aligned with. */
  viaPlankCids: string[]
  /** 'direct' if it is directly aligned with any plank, else 'indirect'. */
  alignmentType: 'direct' | 'indirect'
}

export interface UseCauseProjectsResult {
  projects: CauseProject[]
  totals: AlignedProjectFundingTotals | undefined
  /** Aligned project count per plank CID, for the per-plank strip. */
  countByPlankCid: Map<string, number>
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCauseProjects(publishedCids: string[]): UseCauseProjectsResult {
  const machinery = useMachinery()
  const [projects, setProjects] = useState<CauseProject[]>([])
  const [totals, setTotals] = useState<AlignedProjectFundingTotals>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const publishedKey = publishedCids.join('\0')
  const generationRef = useRef(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    const cids = publishedKey ? publishedKey.split('\0').filter(Boolean) : []
    if (cids.length === 0) {
      setProjects([])
      setTotals(undefined)
      setLoading(false)
      setError(null)
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
        const perPlank = await Promise.all(
          cids.map(async (cid) => ({
            cid,
            aligned: await getAllAlignedProjectsForCause(machinery, cid as IpfsCidV1),
          })),
        )
        if (isStale()) return

        // Dedupe by project address: one project aligned with three planks is
        // one project's worth of money, and summing per-plank totals instead
        // would report it three times.
        const byAddress = new Map<string, CauseProject>()
        for (const { cid, aligned } of perPlank) {
          for (const project of aligned) {
            const existing = byAddress.get(project.projectAddress)
            if (existing) {
              if (!existing.viaPlankCids.includes(cid)) existing.viaPlankCids.push(cid)
              // Direct alignment with any plank is the stronger claim.
              if (project.alignmentType === 'direct') existing.alignmentType = 'direct'
              continue
            }
            byAddress.set(project.projectAddress, {
              projectAddress: project.projectAddress,
              fundingCurrency: project.fundingCurrency,
              totalReceived: project.totalReceived,
              threshold: project.threshold,
              deadline: project.deadline,
              alignmentType: project.alignmentType,
              viaPlankCids: [cid],
            })
          }
        }

        const deduped = [...byAddress.values()]
        const folded = await foldAlignedProjectFunding(
          machinery,
          deduped.map((project) => ({
            projectAddress: project.projectAddress,
            fundingCurrency: project.fundingCurrency,
            totalReceived: project.totalReceived,
            threshold: project.threshold,
            deadline: project.deadline,
          })),
        )
        if (isStale()) return
        setProjects(deduped)
        setTotals(folded)
      } catch (err) {
        if (isStale()) return
        setProjects([])
        setTotals(undefined)
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        if (!isStale()) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [machinery, publishedKey, tick])

  const countByPlankCid = useMemo(() => {
    const counts = new Map<string, number>()
    for (const project of projects) {
      for (const cid of project.viaPlankCids) {
        counts.set(cid, (counts.get(cid) ?? 0) + 1)
      }
    }
    return counts
  }, [projects])

  return { projects, totals, countByPlankCid, loading, error, refresh }
}
