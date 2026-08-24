import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { CauseLeaderboard } from '@ui/fundingportals'
import {
  causePath,
  getCause,
  listCauses,
  publishedPlanks,
  type CauseDraft,
} from '../lib/causeStore'
import {
  applyPlankTexts,
  loadPlankTexts,
  loadRosterDocument,
  parseCauseRouteParams,
  placeholderPlanksFromCids,
  resolveRosterCid,
} from '../lib/causeRoster'
import { useMachinery } from '../lib/useMachinery'

function findLocalByStable(owner: string, slug: string): CauseDraft | undefined {
  const ownerLc = owner.toLowerCase()
  return listCauses().find(
    (cause) => cause.slug === slug && cause.founderAddress?.toLowerCase() === ownerLc,
  )
}

/** CauseStarter host for the shared fundingportals {@link CauseLeaderboard}, unioned across a cause's published statements. */
export function CauseBoardLeaderboardPage() {
  const params = useParams<{ causeId?: string; owner?: string; slugPart?: string }>()
  const machinery = useMachinery()

  const routeRef = useMemo(
    () => parseCauseRouteParams(params.owner, params.slugPart),
    [params.owner, params.slugPart],
  )
  const localId = !routeRef ? params.causeId : undefined

  const [cause, setCause] = useState<CauseDraft | undefined>(() =>
    localId ? getCause(localId) : undefined,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingCause, setLoadingCause] = useState(Boolean(routeRef))

  useEffect(() => {
    if (!localId) return
    setCause(getCause(localId))
    setLoadingCause(false)
    setLoadError(null)
  }, [localId])

  useEffect(() => {
    if (!routeRef) return
    let cancelled = false
    void (async () => {
      setLoadingCause(true)
      setLoadError(null)
      try {
        const local = findLocalByStable(routeRef.owner, routeRef.slug)
        const tipCid = await resolveRosterCid(machinery, routeRef.owner, routeRef.slug)
        const rosterCid = routeRef.versionCid || tipCid
        if (!rosterCid) {
          if (local) {
            if (!cancelled) setCause(local)
            return
          }
          throw new Error('No published cause found for this link.')
        }
        const loaded = await loadRosterDocument(machinery, rosterCid)
        if (!loaded) throw new Error('Could not load the published cause for this link.')

        const causeId = local?.id ?? `remote:${routeRef.owner}:${routeRef.slug}`
        if (cancelled) return
        setCause({
          id: causeId,
          planks: placeholderPlanksFromCids(loaded.fields.plankCids),
          title: loaded.fields.title,
          summary: loaded.fields.summary,
          contactUrl: loaded.fields.contactUrl,
          slug: routeRef.slug,
          founderAddress: routeRef.owner,
          rosterCid,
          createdAt: local?.createdAt ?? new Date().toISOString(),
          updatedAt: local?.updatedAt ?? new Date().toISOString(),
        })
        setLoadingCause(false)

        try {
          const texts = await loadPlankTexts(machinery, loaded.fields.plankCids)
          if (cancelled) return
          setCause((current) => {
            if (!current || current.id !== causeId) return current
            return { ...current, planks: applyPlankTexts(current.planks, texts) }
          })
        } catch {
          // Roster already painted; missing statement bodies stay as CID stubs.
        }
      } catch (err) {
        if (!cancelled) {
          setCause(undefined)
          setLoadError(err instanceof Error ? err.message : 'Failed to load cause')
        }
      } finally {
        if (!cancelled) setLoadingCause(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [routeRef, machinery])

  if (loadingCause && !cause) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!cause) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {loadError || 'Cause not found on this device.'}
        </Alert>
        <Button component={RouterLink} to="/causes" sx={{ textTransform: 'none' }}>
          Back to cause boards
        </Button>
      </Stack>
    )
  }

  const publishedCids = publishedPlanks(cause).map((plank) => plank.cid!).filter(Boolean)

  if (publishedCids.length === 0) {
    return (
      <Stack spacing={2}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Publish a statement to see contributors across this cause board.
        </Alert>
        <Button component={RouterLink} to={causePath(cause)} sx={{ textTransform: 'none' }}>
          Back to cause board
        </Button>
      </Stack>
    )
  }

  return (
    <CauseLeaderboard
      statementCids={publishedCids}
      backLink={{ label: '← Back to cause board', to: causePath(cause) }}
    />
  )
}
