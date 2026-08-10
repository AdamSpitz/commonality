import { useEffect, useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { CauseBoard } from '@ui/fundingportals'
import { getCause, type CauseDraft } from '../lib/causeStore'

/**
 * CauseStarter host for the shared fundingportals {@link CauseBoard}.
 * This is the primary in-app cause board (not a deep-link out to Aligning).
 */
export function CauseBoardPage() {
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
          Publish this cause before opening its board. The board is keyed by the on-chain goal
          statement.
        </Alert>
        <Button
          component={RouterLink}
          to={`/start?id=${cause.id}`}
          variant="contained"
          sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
        >
          Continue setup
        </Button>
        <Button component={RouterLink} to={`/cause/${cause.id}`} sx={{ textTransform: 'none' }}>
          Back to cause
        </Button>
      </Stack>
    )
  }

  return (
    <CauseBoard
      statementCid={cause.statementCid}
      preferredTitle={cause.name || undefined}
      preferredSummary={cause.goal || undefined}
      projectLinks="local"
      navLinks={[
        { label: '← Back to cause', to: `/cause/${cause.id}` },
        {
          label: 'View Leaderboard',
          to: `/cause/${cause.id}/board/leaderboard`,
          variant: 'outlined',
        },
      ]}
    />
  )
}
