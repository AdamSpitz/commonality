import { Box, CircularProgress, Tooltip } from '@mui/material'

/**
 * Out-of-flow spinner so trust-network recompute does not shove page content.
 * Explanation lives in the tooltip / aria-label.
 */
export function TrustNetworkRefreshIndicator({
  title,
}: {
  title: string
}) {
  return (
    <Tooltip title={title} slotProps={{ tooltip: { sx: { maxWidth: 360 } } }}>
      <Box
        component="span"
        role="status"
        aria-label={title}
        data-testid="trust-network-refresh"
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          pointerEvents: 'auto',
        }}
      >
        <CircularProgress size={14} thickness={5} />
      </Box>
    </Tooltip>
  )
}
