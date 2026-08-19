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
 * The bridges attached to one cause: which clusters quote it, and — for its
 * organizer — a way to write another, plus the quieter standalone mediator path.
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

  // A supporter with nothing to look at gets no empty section at all.
  if (!organizer && rows.length === 0) return null

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
          : 'Mediator-authored clusters that involve this cause. They are published by their mediator, not by this cause\u2019s organizer.'}
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

        {organizer && rows.length === 0 && !cause.mediator && (
          <Typography variant="body2" color="text.secondary" data-testid="cause-bridges-empty">
            No bridges yet.
          </Typography>
        )}
      </Stack>

      {organizer && <Box sx={{ mt: 2 }}>
        <Button
          component={RouterLink}
          to="/bridge/new"
          variant="outlined"
          data-testid="cause-create-bridge"
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
        >
          Create a bridge
        </Button>
      </Box>}

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
