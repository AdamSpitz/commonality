import { Box, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export interface StatementSupportCounts {
  direct: number
  indirect: number
  total: number
}

function supportSummary(
  support: StatementSupportCounts | undefined,
  loading: boolean,
): string {
  if (!support) return loading ? 'Counting signers…' : 'Signers unavailable'
  // Keep both provenance categories visible even when indirect support is zero.
  return `${support.direct} direct · ${support.indirect} indirect`
}

/**
 * Signer totals plus a link to the statement's fundable-projects section.
 * Cause plank rows add a selection eye beside this; the signed-statements
 * list does not.
 */
export function StatementSupportStats({
  statementCid,
  support,
  supportLoading,
  projectCount,
}: {
  statementCid: string
  support: StatementSupportCounts | undefined
  supportLoading: boolean
  projectCount: number
}) {
  return (
    <Typography variant="caption" color="text.secondary">
      {support
        ? `${support.total.toLocaleString()} · ${supportSummary(support, supportLoading)}`
        : supportSummary(support, supportLoading)}
      {' · '}
      <Box
        component={RouterLink}
        to={`/statement/${statementCid}?section=fundable-projects`}
        sx={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
      >
        {projectCount > 0
          ? `${projectCount} project${projectCount === 1 ? '' : 's'}`
          : 'Projects'}
      </Box>
    </Typography>
  )
}
