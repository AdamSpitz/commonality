import { Box, Typography } from '@mui/material'

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

export function WebsiteBeneficiaryMark({
  domain,
  size = 'card',
}: {
  domain: string
  size?: 'card' | 'hero'
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
          ? 'Funds reserved for the controller of this website. Domain control is the only identity escrow can enforce — not charity status, legal-entity identity, or tax deductibility.'
          : 'For the controller of this website. Not affiliated unless they claim it.'}
      </Typography>
    </Box>
  )
}
