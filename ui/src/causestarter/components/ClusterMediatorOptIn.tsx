import { useState } from 'react'
import { Button, Paper, Stack, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import {
  addTrustedNudger,
  getMediatorOptInPath,
  isTrustedNudger,
  loadTrustedNudgers,
  mediatorNudgerFromCause,
  removeTrustedNudger,
} from '@ui/shared'
import type { BridgeClusterFields } from '../lib/bridgeCluster'

const DEFAULT_DESCRIPTION =
  'Suggests modified wordings of the causes this mediator bridged. Signing stays your choice.'

export function clusterMediatorEntry(fields: Pick<BridgeClusterFields, 'mediatorAddress' | 'mediatorName' | 'mediatorNote'>) {
  return mediatorNudgerFromCause({
    address: fields.mediatorAddress,
    name: fields.mediatorName,
    description: fields.mediatorNote.trim() || DEFAULT_DESCRIPTION,
  })
}

export function clusterMediatorOptInPath(fields: Pick<BridgeClusterFields, 'mediatorAddress' | 'mediatorName' | 'mediatorNote'>): string {
  const entry = clusterMediatorEntry(fields)
  if (!entry) return '/settings'
  return getMediatorOptInPath(entry)
}

/**
 * Opt in to this cluster's mediator address. No service URL — republish is the tick.
 */
export function ClusterMediatorOptIn({
  fields,
}: {
  fields: Pick<BridgeClusterFields, 'mediatorAddress' | 'mediatorName' | 'mediatorNote'>
}) {
  const entry = clusterMediatorEntry(fields)
  const [nudgers, setNudgers] = useState(loadTrustedNudgers)
  const optedIn = isTrustedNudger(fields.mediatorAddress, nudgers)

  const toggle = () => {
    if (!entry) return
    setNudgers(optedIn ? removeTrustedNudger(fields.mediatorAddress) : addTrustedNudger(entry))
  }

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      data-testid="cluster-mediator-optin-card"
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Listen to this mediator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You are opting into <strong>{fields.mediatorName}</strong>'s address, not this page.
            Later parent→modified suggestions appear if they publish again. Opening this cluster
            does not subscribe you.
          </Typography>
        </Stack>
        <Button
          variant={optedIn ? 'outlined' : 'contained'}
          size="small"
          disabled={!entry}
          onClick={toggle}
          startIcon={optedIn ? <CheckIcon /> : undefined}
          aria-pressed={optedIn}
          data-testid="cluster-mediator-optin"
          sx={{ textTransform: 'none', borderRadius: 999, flexShrink: 0 }}
        >
          {optedIn ? 'Opted in' : 'Opt in'}
        </Button>
      </Stack>
    </Paper>
  )
}
