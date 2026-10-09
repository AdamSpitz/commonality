import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { getDomainUrl, getRuntimeConfigValue } from '../../shared'
import { getContentProperty } from '../properties'

export function FundPropertyRoute() {
  const { propertyId = '' } = useParams()
  return <FundPropertyPage propertyId={propertyId} />
}

export function FundPropertyPage({ propertyId }: { propertyId: string }) {
  const property = getContentProperty(propertyId)
  const statementCid = property?.usesNoninflammatoryTopic
    ? (getRuntimeConfigValue('VITE_NONINFLAMMATORY_TOPIC_CID') || '').trim()
    : ''
  const alignmentHref = statementCid
    ? getDomainUrl('alignment', `/portal/${encodeURIComponent(statementCid)}`)
    : getDomainUrl('alignment', '/')
  const delegateHref = statementCid
    ? getDomainUrl('content-funding', `/delegation/notes/new?statement=${encodeURIComponent(statementCid)}`)
    : getDomainUrl('content-funding', '/delegation/notes/new')

  if (!property) {
    return <Alert severity="warning">That content property is not configured.</Alert>
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Put money on {property.label}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        This is a pledge toward the property itself: money for posts that pass the check, not for one channel. The pool lives on Aligning. A delegate you trust can make the individual picks. You can change either later.
      </Typography>
      {!statementCid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This build has no statement for this property, so the pledge cannot be aimed yet.
        </Alert>
      )}
      <Paper sx={{ p: 2, maxWidth: 760 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">{property.summary}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={alignmentHref} variant="contained" disabled={!statementCid}>
              Pledge on Aligning
            </Button>
            <Button component="a" href={delegateHref} variant="outlined" disabled={!statementCid}>
              Delegate the picks
            </Button>
            <Button component={RouterLink} to={`/explore/${property.id}`} variant="text">
              Back to the board
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
