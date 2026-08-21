import { useState } from 'react'
import { Button, Paper, Stack, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { Link as RouterLink } from 'react-router-dom'
import {
  addTrustedNudger,
  isTrustedNudger,
  loadTrustedNudgers,
  serviceMediatorFromCause,
  removeTrustedNudger,
} from '@ui/shared'
import type { CauseMediator } from '../lib/causeStore'

/**
 * Opt-in path for a client that is not this one (or that cannot toggle in
 * place). CauseStarter reads the same store directly, so its own card toggles.
 */
export function causeMediatorOptInPath(mediator: CauseMediator): string {
  const params = new URLSearchParams({
    addNudger: mediator.address,
    nudgerName: mediator.name,
    nudgerDescription: mediator.description,
    nudgerServiceUrl: mediator.serviceUrl,
    nudgerSourceType: 'bridge-creator',
  })
  return `/settings?${params.toString()}`
}

/**
 * A cause's mediator, compact: who it is, and whether you are listening to it.
 *
 * What it actually proposes lives on the mediator's own page. A cause page is
 * already long, and a wall of another party's statements is the wrong thing to
 * spend that length on — the decision here is only "do I want its suggestions?".
 */
export function CauseMediatorCard({ mediator, detailPath }: {
  mediator: CauseMediator
  /** Omitted on the mediator's own page, where the link would point at itself. */
  detailPath?: string
}) {
  const entry = serviceMediatorFromCause(mediator)
  const [nudgers, setNudgers] = useState(loadTrustedNudgers)
  const optedIn = isTrustedNudger(mediator.address, nudgers)

  const toggle = () => {
    if (!entry) return
    setNudgers(optedIn ? removeTrustedNudger(mediator.address) : addTrustedNudger(entry))
  }

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      data-testid="cause-mediator-card"
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {mediator.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {detailPath
              ? <>Mediator · <RouterLink to={detailPath}>see what it proposes</RouterLink></>
              : mediator.description}
          </Typography>
        </Stack>
        <Button
          variant={optedIn ? 'outlined' : 'contained'}
          size="small"
          disabled={!entry}
          onClick={toggle}
          startIcon={optedIn ? <CheckIcon /> : undefined}
          aria-pressed={optedIn}
          data-testid="cause-mediator-optin"
          sx={{ textTransform: 'none', borderRadius: 999, flexShrink: 0 }}
        >
          {optedIn ? 'Opted in' : 'Opt in'}
        </Button>
      </Stack>
      {!entry && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          This mediator's published identity is incomplete, so it cannot be enabled.
        </Typography>
      )}
    </Paper>
  )
}
