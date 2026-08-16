import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Link as MuiLink, Paper, Stack, Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { getChannelDisplayLabels, useContentFundingState } from '@ui/content-funding'
import { useTrustedContentAttesters } from '@ui/shared'
import {
  contentChannelPath,
  contentItemPublicUrl,
  selectAlignedContentItems,
} from '../lib/alignedContent'
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

export function CauseContentBoardPage() {
  const params = useParams<{ causeId?: string; owner?: string; slugPart?: string }>()
  const machinery = useMachinery()
  const { channels, contentAttestations, channelDisplayMetadata, loading: contentLoading, error: contentError } =
    useContentFundingState()
  const trustedContentAttesters = useTrustedContentAttesters()

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
          Back to causes
        </Button>
      </Stack>
    )
  }

  const plankCids = publishedPlanks(cause).map((plank) => plank.cid!).filter(Boolean)
  const items = selectAlignedContentItems(
    channels,
    contentAttestations,
    plankCids,
    trustedContentAttesters.map((entry) => entry.address),
  )
  const backTo = causePath(cause)

  return (
    <Stack spacing={2.5} data-testid="cause-content-board">
      <Button component={RouterLink} to={backTo} sx={{ textTransform: 'none', alignSelf: 'flex-start' }}>
        ← Back to cause
      </Button>

      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Content board
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Social-media content aligned with this cause
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Posts, videos, and essays attested as advancing one of this cause&apos;s published
          statements — not a sitewide creator directory.
        </Typography>
      </Box>

      {plankCids.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Publish a statement before a content board can show aligned social-media work.
        </Alert>
      )}

      {contentError && <Alert severity="warning" sx={{ borderRadius: 2 }}>{contentError}</Alert>}

      {plankCids.length > 0 && contentLoading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading aligned content…</Typography>
        </Stack>
      )}

      {plankCids.length > 0 && !contentLoading && items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No social-media content is attested to these statements yet.
        </Typography>
      )}

      <Stack spacing={1.25}>
        {items.map((item) => {
          const publicUrl = contentItemPublicUrl(item.canonicalId)
          const channelPath = contentChannelPath(item.channelCanonicalId)
          const labels = getChannelDisplayLabels(
            item.channelCanonicalId,
            item.channelCanonicalId ? channelDisplayMetadata.get(item.channelCanonicalId) : undefined,
          )
          return (
            <Paper
              key={`${item.canonicalId}:${item.contractAddress}`}
              elevation={0}
              sx={{ p: 1.75, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                {item.canonicalId}
              </Typography>
              {labels.primary && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  {labels.primary}
                  {labels.secondary ? ` · ${labels.secondary}` : ''}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {publicUrl && (
                  <MuiLink href={publicUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                    View post
                  </MuiLink>
                )}
                {channelPath && (
                  <MuiLink component={RouterLink} to={channelPath} variant="body2">
                    Channel contract
                  </MuiLink>
                )}
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Stack>
  )
}
