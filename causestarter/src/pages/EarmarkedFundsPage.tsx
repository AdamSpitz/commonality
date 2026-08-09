import { useEffect, useState } from 'react'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { DelegatableNotesSection } from '@ui/fundingportals'
import { getCause, type CauseDraft } from '../lib/causeStore'

/**
 * Full earmarked-funds view for a local cause (pledge rollups + note table).
 * Hosted on CauseStarter; reuses the shared fundingportals section in detail mode.
 */
export function EarmarkedFundsPage() {
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
          Publish this cause before viewing earmarked funds. Funds are tagged against the
          on-chain goal statement.
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
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to={`/cause/${cause.id}`}
        sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
      >
        ← Back to {cause.name?.trim() || 'cause'}
      </Button>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
        {cause.name?.trim() || 'Cause'}
      </Typography>
      <DelegatableNotesSection statementCid={cause.statementCid} variant="detail" />
    </Stack>
  )
}
