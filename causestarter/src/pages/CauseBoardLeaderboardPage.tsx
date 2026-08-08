import { useEffect, useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { CauseLeaderboard } from '@ui/fundingportals'
import { getCause, type CauseDraft } from '../lib/causeStore'

/**
 * CauseStarter host for the shared fundingportals {@link CauseLeaderboard}.
 */
export function CauseBoardLeaderboardPage() {
  const { causeId } = useParams<{ causeId: string }>()
  const [cause, setCause] = useState<CauseDraft | undefined>(() =>
    causeId ? getCause(causeId) : undefined,
  )

  useEffect(() => {
    setCause(causeId ? getCause(causeId) : undefined)
  }, [causeId])

  if (!cause) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Cause not found on this device.
        </Alert>
        <Button component={RouterLink} to="/momentum" sx={{ textTransform: 'none' }}>
          Back to momentum
        </Button>
      </Stack>
    )
  }

  if (!cause.statementCid) {
    return (
      <Stack spacing={2}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Publish this cause before opening its leaderboard.
        </Alert>
        <Button component={RouterLink} to={`/cause/${cause.id}`} sx={{ textTransform: 'none' }}>
          Back to cause
        </Button>
      </Stack>
    )
  }

  return (
    <CauseLeaderboard
      statementCid={cause.statementCid}
      backLink={{ label: '← Back to Cause Board', to: `/cause/${cause.id}/board` }}
    />
  )
}
