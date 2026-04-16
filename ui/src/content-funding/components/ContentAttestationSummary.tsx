import { Stack, Chip, Tooltip } from '@mui/material'
import { truncateAddress } from '../../delegation/utils'
import type { ContentAttestationInfo } from '../hooks/useContentFundingState'

interface ContentAttestationSummaryProps {
  attestations?: ContentAttestationInfo[]
}

export function ContentAttestationSummary({ attestations }: ContentAttestationSummaryProps) {
  if (!attestations || attestations.length === 0) {
    return null
  }

  const sortedAttestations = [...attestations].sort((a, b) =>
    a.attester.toLowerCase().localeCompare(b.attester.toLowerCase()),
  )

  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
      {sortedAttestations.map((attestation) => (
        <Tooltip
          key={`${attestation.attester}-${attestation.statementCid}`}
          title={`Verified by ${attestation.attester}`}
        >
          <Chip
            label={truncateAddress(attestation.attester)}
            size="small"
            color="success"
            variant="outlined"
          />
        </Tooltip>
      ))}
    </Stack>
  )
}
