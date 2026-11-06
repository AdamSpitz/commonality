import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { getUserSocialData, type UserSocialData } from '@commonality/sdk/signer-profiles'
import { useMachinery } from '../hooks/useMachinery'
import { AccountName } from './AccountName'

interface AddressDisplayProps {
  address: string
  /** Show the full address below the ENS name */
  showFullAddress?: boolean
  /** Explain why a raw wallet address is shown for non-technical users. */
  explainAddress?: boolean
  variant?: 'body1' | 'body2' | 'h6' | 'subtitle1'
  twitterHandleHint?: string
}

/**
 * Displays an Ethereum address with its ENS name (if available).
 * Shows "ensname.eth" as the primary display with the address in a tooltip.
 * Falls back to the raw address if no ENS name is found.
 */
export function AddressDisplay({
  address,
  showFullAddress = false,
  explainAddress = false,
  variant = 'body2',
  twitterHandleHint,
}: AddressDisplayProps) {
  const machinery = useMachinery()
  const [socialData, setSocialData] = useState<UserSocialData | null>(null)

  useEffect(() => {
    getUserSocialData(machinery, address, { twitterHandleHint })
      .then(setSocialData)
      .catch(() => {}) // silently fail — just show the address
  }, [machinery, address, twitterHandleHint])

  const ensName = socialData?.ensName
  const twitterHandle = socialData?.twitterHandle
  const label = ensName || twitterHandle || address
  const named = Boolean(ensName || twitterHandle)

  return (
    <Box>
      <Typography
        variant={variant}
        color={named ? undefined : 'text.secondary'}
        sx={{ fontWeight: named ? 500 : undefined, fontFamily: named ? undefined : 'monospace' }}
      >
        <AccountName address={address} label={label} detail={named ? label : null} />
      </Typography>
      {showFullAddress && label !== address && (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
          {address}
        </Typography>
      )}
      {explainAddress && <AddressExplanation />}
    </Box>
  )
}

function AddressExplanation() {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
      This is the public wallet address for the onchain actions shown here; it is an identifier, not a private key or a payment request.
    </Typography>
  )
}
