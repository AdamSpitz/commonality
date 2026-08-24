/**
 * Preview-before-publish for the cause roster.
 *
 * "Publish" and "Publish anyway" are peers — same prominence, no warning dialog.
 * Declining the badge only means the page renders without one (the default).
 * Any edit voids the verdict (caller clears coherence when fields change).
 */

import {
  Alert, Box, Button, CircularProgress, Stack, TextField, Typography,
} from '@mui/material'
import { InfoChip } from '@ui/shared'
import type { CoherenceVerdict } from '../lib/causeAssistClient'
import { normalizeSlug, validateSlug } from '../lib/causeRoster'

function shortAddr(address: string): string {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export interface RosterPublishPanelProps {
  title: string
  summary: string
  contactUrl: string
  slug: string
  previewCid: string | null
  coherence: CoherenceVerdict | null
  /** On-chain badge for the currently published roster tip (if any). */
  onChainBadge?: { attesters: string[]; attestedAt?: string } | null
  slugLocked: boolean
  canPublish: boolean
  checking: boolean
  publishing: boolean
  disabled: boolean
  walletReady: boolean
  lastPublishedCid?: string
  rosterAgeLabel?: string
  onTitleChange: (value: string) => void
  onSummaryChange: (value: string) => void
  onContactUrlChange: (value: string) => void
  onSlugChange: (value: string) => void
  onCheckCoherence: () => void
  onPublish: () => void
  onPublishAnyway: () => void
}

export function RosterPublishPanel({
  title,
  summary,
  contactUrl,
  slug,
  previewCid,
  coherence,
  onChainBadge,
  slugLocked,
  canPublish,
  checking,
  publishing,
  disabled,
  walletReady,
  lastPublishedCid,
  rosterAgeLabel,
  onTitleChange,
  onSummaryChange,
  onContactUrlChange,
  onSlugChange,
  onCheckCoherence,
  onPublish,
  onPublishAnyway,
}: RosterPublishPanelProps) {
  const slugError = slug ? validateSlug(normalizeSlug(slug)) : 'Choose a URL slug for this cause board.'
  const busy = checking || publishing || disabled
  const badgeMatches = Boolean(
    coherence
    && previewCid
    && coherence.rosterCid === previewCid
    && coherence.coherent,
  )
  const verdictStale = Boolean(
    coherence && previewCid && coherence.rosterCid !== previewCid,
  )

  return (
    <Stack spacing={1.5} data-testid="roster-publish-panel">
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Publish this cause board</Typography>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Title, summary, statement list, and mediator blurb publish together as a versioned
          cause board. The URL stays stable when you edit; each publish is a new version.
        </Alert>
      </Box>

      {lastPublishedCid && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Published
          {rosterAgeLabel ? ` · last changed ${rosterAgeLabel}` : ''}
          {' · '}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
            {lastPublishedCid.slice(0, 18)}…
          </Typography>
        </Alert>
      )}

      {onChainBadge && onChainBadge.attesters.length > 0 && (
        <Alert severity="success" sx={{ borderRadius: 2 }} data-testid="roster-on-chain-badge">
          Coherence badge on chain
          {onChainBadge.attesters.length === 1
            ? ` · attester ${shortAddr(onChainBadge.attesters[0]!)}`
            : ` · ${onChainBadge.attesters.length} attesters`}
          . Viewers recompute this from the published cause CID and AlignmentAttestations.
        </Alert>
      )}

      <TextField
        label="Title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        fullWidth
        size="small"
        disabled={busy}
        helperText="Shown at the top of the cause board and sealed into the published version."
        slotProps={{ htmlInput: { 'data-testid': 'roster-title' } }}
      />
      <TextField
        label="Summary"
        value={summary}
        onChange={(event) => onSummaryChange(event.target.value)}
        fullWidth
        size="small"
        multiline
        minRows={2}
        disabled={busy}
        helperText="Optional public blurb for the cause board. Distinct from the statements people sign."
        slotProps={{ htmlInput: { 'data-testid': 'roster-summary' } }}
      />
      <TextField
        label="Contact (optional)"
        value={contactUrl}
        onChange={(event) => onContactUrlChange(event.target.value)}
        fullWidth
        size="small"
        disabled={busy}
        placeholder="https://… or mailto:you@example.com"
        helperText="A public pointer you already use. Empty means do not ping you. Commonality never sends the message."
        slotProps={{ htmlInput: { 'data-testid': 'roster-contact-url' } }}
      />
      <TextField
        label="URL slug"
        value={slug}
        onChange={(event) => onSlugChange(event.target.value)}
        fullWidth
        size="small"
        disabled={busy || slugLocked}
        error={Boolean(slug) && Boolean(slugError)}
        helperText={
          slugLocked
            ? 'Slug is the stable part of your share link and cannot be changed here.'
            : (slug && slugError) || 'Lowercase letters, numbers, hyphens. Goes in the share URL.'
        }
        slotProps={{ htmlInput: { 'data-testid': 'roster-slug' } }}
      />

      {previewCid && (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          Would-be version: {previewCid}
        </Typography>
      )}

      {coherence && !verdictStale && (
        <Alert
          severity={coherence.coherent ? 'success' : 'info'}
          sx={{ borderRadius: 2 }}
          data-testid="roster-coherence-verdict"
        >
          {coherence.coherent
            ? `Coherent (${coherence.attesterId}): ${coherence.reasoning}`
            : `No coherence badge (${coherence.attesterId}): ${coherence.reasoning}`}
        </Alert>
      )}
      {verdictStale && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          The page changed since the last check — preview again if you want a badge.
        </Alert>
      )}

      {!walletReady && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Connect a wallet to publish the cause board on chain.
        </Alert>
      )}

      {!canPublish && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Publish at least one statement before publishing the cause board.
        </Alert>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          onClick={onCheckCoherence}
          disabled={busy || !canPublish || Boolean(slugError)}
          startIcon={checking ? <CircularProgress size={16} /> : undefined}
          sx={{ textTransform: 'none' }}
          data-testid="roster-check-coherence"
        >
          {checking ? 'Checking…' : 'Preview coherence'}
        </Button>
        <Button
          variant="contained"
          onClick={onPublish}
          disabled={busy || !canPublish || Boolean(slugError) || !walletReady || !badgeMatches}
          startIcon={publishing ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ textTransform: 'none' }}
          data-testid="roster-publish"
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </Button>
        <Button
          variant="contained"
          color="inherit"
          onClick={onPublishAnyway}
          disabled={busy || !canPublish || Boolean(slugError) || !walletReady}
          sx={{ textTransform: 'none' }}
          data-testid="roster-publish-anyway"
        >
          Publish anyway
        </Button>
        {badgeMatches && (
          <InfoChip
            size="small"
            color="success"
            label="Badge ready"
            sx={{ alignSelf: 'center' }}
            title="CauseStarter's coherence checker is ready to attest that this title and description match the statements. Publishing will attach that badge."
          />
        )}
      </Stack>
    </Stack>
  )
}
