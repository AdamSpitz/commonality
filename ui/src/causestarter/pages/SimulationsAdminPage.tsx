import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import { OperatorAdminTabs } from '../components/OperatorAdminTabs'
import {
  HEARTBEAT_POLL_MS,
  fetchSimulationHeartbeat,
  isHeartbeatStale,
  simulationHeartbeatUrl,
  type SimulationHeartbeat,
} from '../simulations/simulationHeartbeat'
import { testDataEnvironment } from '../testData/testDataDocuments'

const TEMPLATES = [
  {
    id: 'history-30d-100u',
    kind: 'history factory',
    clock: 'compress',
    blurb: 'Mill the medium-realistic v1 campaign as dated history. Not a day of life.',
    command: 'npm run gen:campaign:execute -- --mode local --replay compress',
  },
  {
    id: 'live-10u-trickle',
    kind: 'live world',
    clock: 'realtime',
    blurb: 'Ten personas, a few writes per hour. Safe to leave on the local stack overnight.',
    command: 'npm run gen:campaign:execute -- --mode local --replay realtime',
  },
  {
    id: 'live-100u-office-hours',
    kind: 'live world',
    clock: 'diurnal',
    blurb: 'Campaign personas on a weekday curve. Not wired yet — CLI campaign plan only.',
    command: null,
  },
  {
    id: 'soak-read',
    kind: 'soak / load',
    clock: 'no extra writes',
    blurb: 'Hammer folds and browse against an existing world. Observers are not built yet.',
    command: null,
  },
] as const

function liveStatus(heartbeat: SimulationHeartbeat, nowMs: number): 'running' | 'stale' | 'stopped' {
  if (heartbeat.stopped) return 'stopped'
  if (isHeartbeatStale(heartbeat, nowMs)) return 'stale'
  return 'running'
}

export function SimulationsAdminPage() {
  const [search] = useSearchParams()
  const capability = search.get('key') ?? ''
  const environment = testDataEnvironment()
  const heartbeatUrl = simulationHeartbeatUrl()
  const [heartbeat, setHeartbeat] = useState<SimulationHeartbeat | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (environment === 'disabled' || !capability || !heartbeatUrl) return
    let cancelled = false
    const poll = () => {
      void fetchSimulationHeartbeat(heartbeatUrl)
        .then(value => {
          if (cancelled) return
          setHeartbeat(value)
          setError(null)
          setNowMs(Date.now())
          setLoaded(true)
        })
        .catch(reason => {
          if (cancelled) return
          setError(reason instanceof Error ? reason.message : String(reason))
          setLoaded(true)
        })
    }
    poll()
    const interval = window.setInterval(poll, HEARTBEAT_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [capability, environment, heartbeatUrl])

  if (environment === 'disabled') {
    return <Alert severity="error">Simulation administration is disabled on mainnet.</Alert>
  }
  if (!capability) {
    return <Alert severity="info">Open the bookmarked admin capability URL to view simulations.</Alert>
  }
  if (!heartbeatUrl) {
    return <Alert severity="warning">No simulation heartbeat URL is configured for this build.</Alert>
  }
  if (error) return <Alert severity="error">{error}</Alert>
  if (!loaded) return <Typography>Loading simulations…</Typography>

  const status = heartbeat ? liveStatus(heartbeat, nowMs) : null

  return (
    <Stack spacing={3} data-testid="simulations-admin-page">
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Operator
        </Typography>
        <Typography variant="h4" component="h1">Simulations</Typography>
        <Typography color="text.secondary">
          Read-only view of the campaign clock. Start and stop from the CLI. Same capability key as test-data runs.
        </Typography>
      </Box>
      <OperatorAdminTabs capability={capability} active="simulations" />

      {heartbeat && status === 'running' ? (
        <Card variant="outlined" data-testid="simulation-live-now">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h6">Live now</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  <Chip size="small" color="primary" label="running" />
                  <Chip size="small" label={heartbeat.replay} />
                  <Chip size="small" label={heartbeat.campaignId} />
                  <Chip size="small" label={`due lag ${heartbeat.dueLagSeconds}s`} />
                  <Chip size="small" label={`${heartbeat.mined} mined`} />
                  <Chip size="small" label={`${heartbeat.planned} planned`} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Updated {new Date(heartbeat.updatedAt).toLocaleString()}. Next due {heartbeat.nextDueAtSim ?? '—'}.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {heartbeat && status === 'stale' ? (
        <Alert severity="warning" data-testid="simulation-heartbeat-stale">
          Last heartbeat for {heartbeat.campaignId} is stale ({new Date(heartbeat.updatedAt).toLocaleString()}).
          The runner may have died. Do not treat this as still running.
        </Alert>
      ) : null}

      {heartbeat && status === 'stopped' ? (
        <Alert severity="info" data-testid="simulation-heartbeat-stopped">
          Last run {heartbeat.campaignId} stopped with {heartbeat.mined} mined, {heartbeat.failed} failed, {heartbeat.planned} still planned.
        </Alert>
      ) : null}

      {!heartbeat ? (
        <Alert severity="info" data-testid="simulation-heartbeat-missing">
          No live heartbeat. Start a clocked campaign with
          {' '}
          <Box component="code" sx={{ fontSize: 13 }}>
            npm run gen:campaign:execute -- --mode local --replay realtime
          </Box>
          .
        </Alert>
      ) : null}

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Templates</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {TEMPLATES.map(template => (
          <Card key={template.id} variant="outlined">
            <CardContent>
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip size="small" label={template.kind} />
                <Chip size="small" label={template.clock} />
              </Stack>
              <Typography variant="h6">{template.id}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>{template.blurb}</Typography>
              {template.command ? (
                <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 1.5 }}>
                  {template.command}
                </Typography>
              ) : null}
              <Button variant="outlined" disabled>
                Start from CLI
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  )
}
