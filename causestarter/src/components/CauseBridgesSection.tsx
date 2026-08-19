import { useMemo } from 'react'
import { Box, Button, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { InfoChip } from '@ui/shared'
import { listBridges, type BridgeDraft } from '../lib/bridgeStore'
import { causeMediatorPath, type CauseDraft } from '../lib/causeStore'
import { normalizeSlug } from '../lib/causeRoster'

function slugKey(raw: string | undefined): string {
  return raw?.trim() ? normalizeSlug(raw) : ''
}

/** A bridge cluster this cause takes part in, reduced to what a row needs. */
interface ClusterRow {
  key: string
  name: string
  to: string
  published: boolean
  detail: string
}

/**
 * The create-a-bridge link, prefilled with this cause as natural parent 1.
 *
 * Prefill needs a *published* parent: the editor loads the parent roster from
 * chain, and an unpublished local draft has nothing to load.
 */
function createBridgeHref(cause: CauseDraft): string {
  const owner = cause.founderAddress?.toLowerCase()
  const slug = slugKey(cause.slug)
  if (!owner || !slug) return '/bridge/new'
  const query = new URLSearchParams({ parentOwner: owner, parentSlug: slug })
  if (cause.title?.trim()) query.set('parentTitle', cause.title.trim())
  return `/bridge/new?${query.toString()}`
}

function clusterPath(draft: BridgeDraft): string {
  return draft.founderAddress && draft.slug
    ? `/bridge/${draft.founderAddress.toLowerCase()}/${encodeURIComponent(draft.slug)}`
    : `/bridge/${draft.id}`
}

/**
 * Clusters on this device that name this cause as a natural parent, plus the
 * cluster this cause belongs to when it is itself a modified sliver or bridge.
 *
 * Local drafts only: there is no index from a cause to the clusters that quote
 * it, and building one would mean a directory we rank (ADR 0005).
 */
export function causeClusterRows(cause: CauseDraft): ClusterRow[] {
  const owner = cause.founderAddress?.toLowerCase()
  const slug = slugKey(cause.slug)
  const rows: ClusterRow[] = []

  if (cause.bridgeCluster) {
    const link = cause.bridgeCluster
    rows.push({
      key: `member:${link.clusterOwner}/${link.clusterSlug}`,
      name: link.clusterSlug,
      to: `/bridge/${link.clusterOwner}/${encodeURIComponent(link.clusterSlug)}`,
      published: true,
      detail: link.role === 'bridge'
        ? 'This cause is the shared bridge of that cluster.'
        : 'This cause is a mediator-authored wording of one side.',
    })
  }

  for (const draft of listBridges()) {
    const isParent = owner && slug && draft.parents.some((parent) => (
      parent.owner.trim().toLowerCase() === owner
      && slugKey(parent.slug) === slug
    ))
    if (!isParent) continue
    const to = clusterPath(draft)
    if (rows.some((row) => row.to === to)) continue
    rows.push({
      key: `parent:${draft.id}`,
      name: draft.mediatorName.trim() || draft.slug || 'Untitled bridge',
      to,
      published: Boolean(draft.clusterCid),
      detail: 'This cause is a natural parent of that cluster.',
    })
  }

  return rows
}

interface CauseBridgesSectionProps {
  cause: CauseDraft
  /**
   * `organizer` adds the authoring affordances. `visitor` is read-only and hides
   * unpublished clusters — a draft on the organizer's device is not something a
   * supporter can open, and the organizer previewing their own page should see
   * what the supporter sees.
   */
  variant?: 'organizer' | 'visitor'
}

/**
 * The bridges attached to one cause: which clusters quote it, and a way to write
 * another. The section renders even when empty so the feature is discoverable,
 * and the create button is offered to visitors too — authoring a bridge needs
 * the mediator's own key, never this cause's. The standalone mediator-service
 * path stays organizer-only and quieter.
 *
 * Rows link out rather than expanding: a cluster's planks, pairs and attestation
 * state belong on the cluster's own page, not inlined into the cause page.
 */
export function CauseBridgesSection({ cause, variant = 'organizer' }: CauseBridgesSectionProps) {
  const organizer = variant === 'organizer'
  const rows = useMemo(
    () => causeClusterRows(cause).filter((row) => organizer || row.published),
    [cause, organizer],
  )

  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      data-testid="cause-bridges-section"
    >
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Bridges</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {organizer
          ? 'A bridge offers people on another side a wording of their own position that implies something yours can also sign. You publish it under your key; it never edits anyone else\u2019s cause.'
          : 'Mediator-authored clusters that involve this cause. A bridge is published under its mediator\u2019s key, not this cause\u2019s organizer\u2019s \u2014 including one you write yourself.'}
      </Typography>

      <Stack spacing={1.25}>
        {organizer && cause.mediator && (
          <Paper
            elevation={0}
            component={RouterLink}
            to={causeMediatorPath(cause)}
            data-testid="cause-mediator-row"
            sx={{
              display: 'block',
              p: 1.75,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {cause.mediator.name}
              </Typography>
              <InfoChip
                size="small"
                label="Mediator service"
                title="A bridge-creator instance you operate, publishing bridges for this cause."
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {cause.mediator.description}
            </Typography>
          </Paper>
        )}

        {rows.map((row) => (
          <Paper
            key={row.key}
            elevation={0}
            component={RouterLink}
            to={row.to}
            data-testid="cause-bridge-row"
            sx={{
              display: 'block',
              p: 1.75,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
              {!row.published && (
                <InfoChip
                  size="small"
                  label="Draft"
                  title="This cluster exists only on this device so far."
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">{row.detail}</Typography>
          </Paper>
        ))}

        {rows.length === 0 && !(organizer && cause.mediator) && (
          <Typography variant="body2" color="text.secondary" data-testid="cause-bridges-empty">
            No bridges yet.
          </Typography>
        )}
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Button
          component={RouterLink}
          to={createBridgeHref(cause)}
          variant="outlined"
          data-testid="cause-create-bridge"
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
        >
          Create a bridge
        </Button>
      </Box>

      {/* Writing a bridge is not an owner privilege: the cluster publishes under
          the mediator's own key, so a visitor needs no permission from this
          organizer. What we cannot yet offer is a way to *tell* them. */}
      {!organizer && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1.5 }}
          data-testid="cause-create-bridge-note"
        >
          You do not have to own this cause to bridge to it. The modified wordings and
          the shared bridge publish under your key, quoting this cause as a natural
          parent. Telling this organizer about it is on you for now — share the
          cluster link wherever you already talk to them.
        </Typography>
      )}

      {organizer && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Advanced:{' '}
        <Link
          component={RouterLink}
          to={causeMediatorPath(cause)}
          data-testid="cause-attach-mediator"
          underline="hover"
        >
          {cause.mediator ? 'edit the attached mediator service' : 'attach a standalone mediator service'}
        </Link>
        {' '}— for organizers running their own bridge-creator instance.
      </Typography>}
    </Paper>
  )
}
