import { Alert, Button, Chip, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material'
import type { TrustedNudgerEntry } from '../hooks/useTrustedNudgers'
import { getMediatorOptInPath } from './mediatorNudger'
import { useMediatorOptIn } from './useMediatorOptIn'

export function MediatorOptInBlock({
  mediator,
  tallyUrl,
  heading = 'Opt in to this cause mediator',
}: {
  mediator: TrustedNudgerEntry | null
  tallyUrl: (path: string) => string
  heading?: string
}) {
  const { optedIn, toggle } = useMediatorOptIn(mediator?.address ?? '', mediator)
  if (!mediator) return <Alert severity="info">This cause has not configured a mediator yet.</Alert>
  return <Paper component="section" aria-label={heading} sx={{ p: 2.5, borderRadius: 3 }}>
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{heading}</Typography>
        <Chip color={optedIn ? 'success' : 'default'} label={optedIn ? 'Opted in' : 'Off by default'} />
      </Stack>
      <Typography variant="body2">{mediator.description} Suggestions appear only after you opt in, and signing remains your choice.</Typography>
      <FormControlLabel control={<Switch checked={optedIn} onChange={toggle} />} label={optedIn ? 'Showing mediator suggestions' : 'Not showing mediator suggestions'} />
      <Button component="a" href={tallyUrl(getMediatorOptInPath(mediator))} variant="contained" sx={{ alignSelf: 'flex-start' }}>
        {optedIn ? 'Open Tally with mediator enabled' : 'Opt in on Tally'}
      </Button>
    </Stack>
  </Paper>
}
