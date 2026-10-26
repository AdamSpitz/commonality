import type { ReactNode } from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Box, Button, Tooltip } from '@mui/material'
import type { SuggestedName } from '@commonality/sdk/suggested-names'
import { suggestionTrustNote, useSuggestedAccountName } from '../accountNames/useSuggestedAccountName'
import { truncateAddress } from '../utils/address'

interface AccountNameProps {
  address: string
  /** Address, ENS name, or other label shown until the user accepts a suggestion. */
  label: string
  /** Extra identifier kept in the tooltip after a name is accepted, such as an ENS name. */
  detail?: string | null
  /** Keep Accept outside a parent button. The parent renders SuggestedNameOffer itself. */
  offer?: 'inline' | 'none'
}

/**
 * Truncated address, plus the shared suggestion accept control.
 * Use this for a plain account. Pass {@link AccountName} only when the fallback
 * is an ENS name, a handle, or some other label.
 */
export function AccountAddress({ address, detail }: { address: string; detail?: string | null }) {
  return <AccountName address={address} label={truncateAddress(address)} detail={detail} />
}

/**
 * Wallet chrome cannot nest the Accept button inside the connect button.
 * This frame renders the name inside `children` and the offer beside it.
 */
export function ConnectedAccountFrame({
  address,
  label,
  detail,
  children,
}: {
  address?: string
  label: string
  detail?: string | null
  children: (name: ReactNode) => ReactNode
}) {
  if (!address) return children(label)
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {children(<AccountName address={address} label={label} detail={detail} offer="none" />)}
      <SuggestedNameOffer address={address} />
    </Box>
  )
}

/**
 * Shows an accepted local name in place of an address or ENS name.
 * Until then, shows `label` and, when one suggestion exists, a one-click accept control.
 */
export function AccountName({ address, label, detail, offer = 'inline' }: AccountNameProps) {
  const { acceptedName, suggestion, accept } = useSuggestedAccountName(address)
  if (acceptedName) {
    const tooltip = [detail, address].filter((part) => part && part !== acceptedName).join(' · ')
    return (
      <Box component="span" title={tooltip || address} sx={{ cursor: 'help', fontWeight: 500 }}>{acceptedName}</Box>
    )
  }

  const unresolved = (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
      <Box component="span">{label}</Box>
      {offer === 'inline' && suggestion ? (
        <SuggestedNameOfferView address={address} suggestion={suggestion} onAccept={accept} />
      ) : null}
    </Box>
  )
  if (label === address) return unresolved
  return <Box component="span" title={address}>{unresolved}</Box>
}

export function SuggestedNameOffer({ address }: { address: string }) {
  const { acceptedName, suggestion, accept } = useSuggestedAccountName(address)
  if (!suggestion || acceptedName) return null
  return <SuggestedNameOfferView address={address} suggestion={suggestion} onAccept={accept} />
}

function SuggestedNameOfferView({
  address,
  suggestion,
  onAccept,
}: {
  address: string
  suggestion: SuggestedName
  onAccept: () => void
}) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: 'text.secondary' }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Box component="span" sx={{ fontSize: '0.75rem' }}>Suggested: {suggestion.name.trim()}</Box>
      <Tooltip title={suggestionTrustNote(suggestion, address)}>
        <InfoOutlinedIcon
          aria-label="About this suggested name"
          sx={{ fontSize: '1rem', cursor: 'help' }}
        />
      </Tooltip>
      <Button
        size="small"
        variant="text"
        onClick={(event) => {
          event.stopPropagation()
          event.preventDefault()
          onAccept()
        }}
        sx={{ minWidth: 0, px: 0.5, py: 0, lineHeight: 1.4, textTransform: 'none' }}
      >
        Accept
      </Button>
    </Box>
  )
}
