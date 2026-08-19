import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { BridgeDisplayBlock } from '@ui/shared'
import { CauseMediatorCard } from '../components/CauseMediatorCard'
import { MediatorEditor } from '../components/MediatorEditor'
import {
  causeEditPath, causePath, causeTitle, findCauseByStable, getCause,
  updateCause, type CauseDraft,
} from '../lib/causeStore'
import {
  loadRosterDocument, parseCauseRouteParams, resolveRosterCid,
} from '../lib/causeRoster'
import { useMachinery } from '../lib/useMachinery'

/**
 * Everything about one cause's mediator, so the cause page doesn't have to carry
 * it: who it is, whether you are listening to it, what it currently proposes,
 * and — for the organizer — the attachment form.
 *
 * The form is deliberately buried here. Almost no cause runs its own
 * bridge-creator instance, and the field set is meaningless without a deployed
 * service to point at. A human-authored bridge needs no service at all.
 */
export function CauseMediatorPage() {
  const params = useParams<{ causeId?: string; owner?: string; slugPart?: string }>()
  const { address } = useAccount()
  const machinery = useMachinery()
  const routeRef = parseCauseRouteParams(params.owner, params.slugPart)
  const [cause, setCause] = useState<CauseDraft | undefined>(() => (
    routeRef
      ? findCauseByStable(routeRef.owner, routeRef.slug)
      : params.causeId ? getCause(params.causeId) : undefined
  ))
  const [loading, setLoading] = useState(Boolean(routeRef) && !cause)

  /** A visitor arriving from a published cause has no local copy to read. */
  useEffect(() => {
    if (!routeRef || cause) return
    let cancelled = false
    void (async () => {
      try {
        const rosterCid = routeRef.versionCid ?? await resolveRosterCid(machinery, routeRef.owner, routeRef.slug)
        const loaded = rosterCid ? await loadRosterDocument(machinery, rosterCid) : null
        if (cancelled || !loaded) return
        setCause({
          id: `remote:${routeRef.owner}:${routeRef.slug}`,
          planks: [],
          title: loaded.fields.title,
          summary: loaded.fields.summary,
          slug: routeRef.slug,
          founderAddress: routeRef.owner,
          rosterCid: rosterCid ?? undefined,
          mediator: loaded.fields.mediator,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } catch {
        // Falls through to the "not on this device" notice below.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [cause, machinery, routeRef])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!cause) {
    return (
      <Stack spacing={2} data-testid="cause-mediator-page">
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          This cause is not on this device, and no published version was found for
          this link.
        </Alert>
        <Button component={RouterLink} to="/causes" sx={{ textTransform: 'none', alignSelf: 'flex-start' }}>
          Back to causes
        </Button>
      </Stack>
    )
  }

  const { mediator } = cause
  /** Published causes: only the founder's wallet. Unpublished drafts: this device. */
  const isOrganizer = Boolean(
    address && cause.founderAddress
    && address.toLowerCase() === cause.founderAddress.toLowerCase(),
  )
  // A remote copy has no local record to patch; open the cause on this device first.
  const canEdit = (!cause.founderAddress || isOrganizer) && !cause.id.startsWith('remote:')

  return (
    <Stack spacing={2.5} data-testid="cause-mediator-page">
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Mediator
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          {mediator?.name ?? 'Standalone mediator'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
          For <RouterLink to={causePath(cause)}>{causeTitle(cause)}</RouterLink>.
          {mediator
            ? ' A service its organizer runs, under their own key and strategy prompt. Its suggestions reach you only if you opt in, and signing stays your choice.'
            : ' This cause has no mediator service attached.'}
        </Typography>
      </Box>

      {mediator && (
        <>
          <CauseMediatorCard mediator={mediator} />
          <BridgeDisplayBlock
            serviceUrl={mediator.serviceUrl}
            labels={{ sideA: 'One side', sideB: 'The other side' }}
            statementHref={(anchor) => (anchor.tally_cid ? `/statement/${anchor.tally_cid}` : '#')}
            title="What it currently proposes"
            description="Featured bridges published by this mediator. Each is a statement you can read in full and sign, or ignore."
          />
        </>
      )}

      {canEdit && (
        <>
          <Divider />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {mediator ? 'Organizer settings' : 'Attach a mediator service'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
              Advanced. If you just want to write one bridge yourself, use{' '}
              <RouterLink to="/bridge/new">Create a bridge</RouterLink> instead — no
              service required.
            </Typography>
            <MediatorEditor
              mediator={mediator}
              onChange={(next) => {
                const updated = updateCause(cause.id, { mediator: next })
                if (updated) setCause(updated)
              }}
            />
          </Box>
        </>
      )}

      <Button
        component={RouterLink}
        to={canEdit ? causeEditPath(cause) : causePath(cause)}
        sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
      >
        ← Back to the cause
      </Button>
    </Stack>
  )
}
