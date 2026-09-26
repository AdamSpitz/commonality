import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, Tooltip } from '@mui/material'
import type { PublishedBeneficiaryBinding } from './usePublishedBeneficiaryBinding'

const VERIFIED_TOOLTIP = (domain: string) =>
  `Verified against this project's contract. Its stored beneficiary id is the hash of dns:${domain}, the same name published in the project metadata. Successful funds are reserved for that id.`

const MISMATCH_TOOLTIP = (domain: string) =>
  `Not verified. The project metadata names ${domain}, but this project's contract does not store that beneficiary id. The name on this page is not what the contract pays.`

export function PublishedBeneficiaryVerifiedMark({
  binding,
}: {
  binding: PublishedBeneficiaryBinding
}) {
  if (binding.status !== 'verified' && binding.status !== 'mismatch') return null

  const verified = binding.status === 'verified'
  const tip = verified ? VERIFIED_TOOLTIP(binding.domain) : MISMATCH_TOOLTIP(binding.domain)

  const icon = verified ? (
    <VerifiedIcon
      data-testid="beneficiary-binding-verified"
      color="success"
      fontSize="small"
      sx={{ verticalAlign: 'middle' }}
    />
  ) : (
    <WarningAmberIcon
      data-testid="beneficiary-binding-mismatch"
      color="warning"
      fontSize="small"
      sx={{ verticalAlign: 'middle' }}
    />
  )

  return (
    <Tooltip title={tip}>
      <Box component="span" aria-label={tip} sx={{ display: 'inline-flex', ml: 0.5 }}>
        {icon}
      </Box>
    </Tooltip>
  )
}
