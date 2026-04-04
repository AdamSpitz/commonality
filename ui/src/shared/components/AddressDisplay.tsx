import { useState, useEffect } from 'react'
import { Box, Typography, Tooltip } from '@mui/material'
import { getUserSocialData, type UserSocialData } from '@commonality/sdk'
import { useMachinery } from '../hooks/useMachinery'

interface AddressDisplayProps {
  address: string
  /** Show the full address below the ENS name */
  showFullAddress?: boolean
  variant?: 'body1' | 'body2' | 'h6' | 'subtitle1'
}

/**
 * Displays an Ethereum address with its ENS name (if available).
 * Shows "ensname.eth" as the primary display with the address in a tooltip.
 * Falls back to the raw address if no ENS name is found.
 */
export function AddressDisplay({ address, showFullAddress = false, variant = 'body2' }: AddressDisplayProps) {
  const machinery = useMachinery()
  const [socialData, setSocialData] = useState<UserSocialData | null>(null)

  useEffect(() => {
    getUserSocialData(machinery, address)
      .then(setSocialData)
      .catch(() => {}) // silently fail — just show the address
  }, [machinery, address])

  const ensName = socialData?.ensName

  if (ensName) {
    return (
      <Box>
        <Tooltip title={address} arrow>
          <Typography variant={variant} sx={{ fontWeight: 500 }}>
            {ensName}
          </Typography>
        </Tooltip>
        {showFullAddress && (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {address}
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Typography variant={variant} color="text.secondary" sx={{ fontFamily: 'monospace' }}>
      {address}
    </Typography>
  )
}
