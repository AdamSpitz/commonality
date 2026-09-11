import { Box, Typography } from '@mui/material'
import type { BeneficiaryState } from '@commonality/sdk/content-funding'
import { COMMUNITY_CREATED_NOTICE } from './websiteBeneficiaryClaim'

/** Exact registrable domain; never truncate or visually fold lookalikes. */
const domainSx = {
  fontWeight: 700,
  letterSpacing: '-0.02em',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  unicodeBidi: 'isolate',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
} as const

export function dnsBeneficiaryDomain(beneficiary?: {
  namespace?: string
  canonicalIdentifier?: string
}): string | undefined {
  if (beneficiary?.namespace !== 'dns') return undefined
  const id = beneficiary.canonicalIdentifier?.trim()
  return id || undefined
}

function cardCaption(claimState?: BeneficiaryState): string {
  if (claimState === 'verified' || claimState === 'beneficiary-controlled') {
    return `${COMMUNITY_CREATED_NOTICE} Domain-controlled. Escrow pays the bound wallet, not a certified charity.`
  }
  return `${COMMUNITY_CREATED_NOTICE} For the controller of this website.`
}

export function WebsiteBeneficiaryMark({
  domain,
  size = 'card',
  claimState,
}: {
  domain: string
  size?: 'card' | 'hero'
  claimState?: BeneficiaryState
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant={size === 'hero' ? 'h4' : 'h6'}
        component="p"
        data-testid="website-beneficiary-domain"
        sx={{ ...domainSx, mt: size === 'hero' ? 0.5 : 0 }}
      >
        {domain}
      </Typography>
      <Typography variant={size === 'hero' ? 'body2' : 'caption'} color="text.secondary">
        {size === 'hero'
          ? `${COMMUNITY_CREATED_NOTICE} Funds reserved for the controller of this website. Domain control is the only identity escrow can enforce — not charity status, legal-entity identity, or tax deductibility.`
          : cardCaption(claimState)}
      </Typography>
    </Box>
  )
}
