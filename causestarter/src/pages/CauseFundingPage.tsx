import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { formatUnits } from 'viem'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import { useCauseMonthlyPledges } from '../hooks/useCauseMonthlyPledges'
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

function formatMonthly(amount: bigint, decimals: number, symbol: string): string {
  return `${formatUnits(amount, decimals)} ${symbol}/month`
}

export function CauseFundingPage() {
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

  const published = cause ? publishedPlanks(cause) : []
  const publishedCids = published.map((plank) => plank.cid!).filter(Boolean)
  const pledges = useCauseMonthlyPledges(publishedCids)

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

  const backTo = causePath(cause)

  return (
    <Stack spacing={2.5} data-testid="cause-funding-page">
      <Button component={RouterLink} to={backTo} sx={{ textTransform: 'none', alignSelf: 'flex-start' }}>
        ← Back to cause
      </Button>

      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Pledges
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Set aside funds for an issue
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {pledges.available && pledges.loading ? (
          <CircularProgress size={20} aria-label="Loading pledges" />
        ) : (
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {pledges.available
                ? formatMonthly(pledges.totalMonthly, pledges.decimals, pledges.symbol)
                : `0 ${pledges.symbol}/month`}{' '}
              pledged overall
            </Typography>
            {pledges.connected ? (
              <Typography variant="body2" color="text.secondary">
                You: {pledges.available
                  ? formatMonthly(pledges.personalMonthly, pledges.decimals, pledges.symbol)
                  : `0 ${pledges.symbol}/month`}
              </Typography>
            ) : (
              <ConnectWalletHint>
                Connect a wallet to see your pledge.
              </ConnectWalletHint>
            )}
            {pledges.available && (
              <Typography variant="caption" color="text.secondary">
                Revocable auto-pull pledges in {pledges.symbol}; an interest signal, not guaranteed funding.
              </Typography>
            )}
          </Stack>
        )}
      </Paper>

      <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="earmark-help">
        Create a one-time delegated fund or a monthly pledge earmarked for one immutable
        statement. The earmark is public, auditable guidance — not a binding restriction
        on a delegate. If they direct the money elsewhere, that will also be public.
        Choosing a delegate is public too. The earmark does not follow later edits to
        this cause publication.
      </Alert>

      {published.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Publish an issue before you can earmark funds or start a monthly pledge.
        </Alert>
      ) : (
        <Stack spacing={1}>
          {published.map((plank) => (
            <Paper
              key={plank.cid}
              elevation={0}
              sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component={RouterLink}
                    to={`/statement/${plank.cid}`}
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {plank.text}
                  </Typography>
                  {pledges.available && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {formatMonthly(pledges.byPlankCid.get(plank.cid!) ?? 0n, pledges.decimals, pledges.symbol)} on this issue
                    </Typography>
                  )}
                </Box>
                <Button
                  component={RouterLink}
                  to={`/delegation/notes/new?statement=${encodeURIComponent(plank.cid!)}`}
                  variant="contained"
                  size="small"
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Make a pledge
                </Button>
                <Button
                  component={RouterLink}
                  to={`/delegates/offer?statement=${encodeURIComponent(plank.cid!)}`}
                  variant="text"
                  size="small"
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Offer to become a delegate
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
