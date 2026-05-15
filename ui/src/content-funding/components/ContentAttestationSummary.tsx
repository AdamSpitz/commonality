import { Stack, Chip, Tooltip } from '@mui/material'
import { truncateAddress } from '../../delegation/utils'
import { useTrustedContentAttesters } from '../../shared/hooks/useTrustedContentAttesters'
import type { ContentAttestationInfo } from '../hooks/useContentFundingState'

interface ContentAttestationSummaryProps {
  attestations?: ContentAttestationInfo[]
}

export function ContentAttestationSummary({ attestations }: ContentAttestationSummaryProps) {
  const trustedAttesters = useTrustedContentAttesters()

  if (!attestations || attestations.length === 0) {
    return null
  }

  const trustedByAddress = new Map(trustedAttesters.map((attester) => [attester.address.toLowerCase(), attester]))
  const sortedAttestations = [...attestations].sort((a, b) =>
    a.attester.toLowerCase().localeCompare(b.attester.toLowerCase()),
  )

  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
      {sortedAttestations.map((attestation) => {
        const trustedAttester = trustedByAddress.get(attestation.attester.toLowerCase())
        const serviceLabel = trustedAttester?.kind === 'beat-agent' ? 'beat agent' : 'content attester'
        const displayName = trustedAttester?.name ?? truncateAddress(attestation.attester)
        const tooltip = trustedAttester
          ? `Trusted ${serviceLabel}: ${trustedAttester.name ? `${trustedAttester.name} (${attestation.attester})` : attestation.attester}`
          : `Verified by untrusted attester ${attestation.attester}`

        return (
          <Tooltip
            key={`${attestation.attester}-${attestation.statementCid}`}
            title={tooltip}
          >
            <Chip
              label={displayName}
              size="small"
              color="success"
              variant={trustedAttester ? 'filled' : 'outlined'}
            />
          </Tooltip>
        )
      })}
    </Stack>
  )
}
