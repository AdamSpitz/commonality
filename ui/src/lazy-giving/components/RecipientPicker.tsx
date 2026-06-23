import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material'
import { usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import { normalize } from 'viem/ens'
import { truncateAddress } from '../../shared'
import { getContacts, addContact, type SavedContact } from '../../shared'

type RecipientMode = 'self' | 'contact' | 'manual'

interface RecipientPickerProps {
  /** Connected wallet address */
  address: string | undefined
  /** Called with the chosen recipient address */
  onChange: (address: `0x${string}` | null) => void
  /** Called when a valid address is confirmed */
  onConfirm?: (address: `0x${string}`) => void
}

/**
 * Layered recipient picker with:
 * 1. "Send to me" default — uses the connected wallet
 * 2. Saved contact list — pick from previously-vetted recipients
 * 3. ENS / paste address — live ENS resolution + confirmation
 */
export function RecipientPicker({ address, onChange, onConfirm }: RecipientPickerProps) {
  const publicClient = usePublicClient()

  const [mode, setMode] = useState<RecipientMode>('self')
  const [contacts, setContacts] = useState<SavedContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [manualInput, setManualInput] = useState('')
  const [manualLabel, setManualLabel] = useState('')
  const [ensResolving, setEnsResolving] = useState(false)
  const [ensResolvedAddress, setEnsResolvedAddress] = useState<string | null>(null)
  const [ensName, setEnsName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  // Track the last resolved input to avoid redundant re-resolutions
  const lastResolvedInput = useRef('')

  // Load contacts when switching to contact mode
  useEffect(() => {
    if (mode === 'contact') {
      loadContacts()
    }
  }, [mode])

  const loadContacts = async () => {
    try {
      setContactsLoading(true)
      const loaded = await getContacts()
      setContacts(loaded)
    } catch (err) {
      console.error('Error loading contacts:', err)
    } finally {
      setContactsLoading(false)
    }
  }

  // Determine the current recipient address based on mode
  const getRecipient = useCallback((): `0x${string}` | null => {
    if (mode === 'self') {
      return address ? (address as `0x${string}`) : null
    }
    if (mode === 'contact' && selectedContact) {
      return selectedContact as `0x${string}`
    }
    if (mode === 'manual') {
      if (ensResolvedAddress) return ensResolvedAddress as `0x${string}`
      if (isAddress(manualInput)) return manualInput as `0x${string}`
    }
    return null
  }, [mode, address, selectedContact, ensResolvedAddress, manualInput])

  // Notify parent when recipient changes
  useEffect(() => {
    const recipient = getRecipient()
    onChange(recipient)
  }, [getRecipient, onChange])

  // ENS resolution: debounced lookup on manual input
  useEffect(() => {
    if (mode !== 'manual') {
      setEnsResolvedAddress(null)
      setEnsName(null)
      setShowConfirmation(false)
      setError(null)
      return
    }

    const trimmed = manualInput.trim()

    // If it's already a valid address, no ENS resolution needed
    if (isAddress(trimmed)) {
      setEnsResolvedAddress(null)
      setEnsName(null)
      setShowConfirmation(false)
      setError(null)
      return
    }

    // Check if it looks like an ENS name
    if (trimmed.endsWith('.eth') || trimmed.includes('.')) {
      // If we already resolved this exact input, don't reset the confirmation
      if (lastResolvedInput.current === trimmed) {
        return
      }

      setEnsResolving(true)
      setError(null)
      setEnsResolvedAddress(null)
      setShowConfirmation(false)

      const timer = setTimeout(async () => {
        try {
          if (!publicClient) {
            setError('Cannot resolve ENS names — no network connection')
            setEnsResolving(false)
            return
          }

          // Normalize the ENS name (ens-normalize)
          const normalizedName = normalize(trimmed)

          const resolved = await publicClient.getEnsAddress({
            name: normalizedName,
          })

          if (resolved) {
            lastResolvedInput.current = trimmed
            setEnsResolvedAddress(resolved)
            setEnsName(normalizedName)
            setShowConfirmation(true)
            setError(null)
          } else {
            setEnsResolvedAddress(null)
            setEnsName(null)
            setError(`Could not resolve "${trimmed}" — no address found for this ENS name`)
          }
        } catch (err) {
          console.error('ENS resolution error:', err)
          setEnsResolvedAddress(null)
          setEnsName(null)
          setError(`Could not resolve ENS name: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
          setEnsResolving(false)
        }
      }, 600) // debounce

      return () => clearTimeout(timer)
    } else {
      // Not an address and not an ENS name — show a hint
      setEnsResolvedAddress(null)
      setEnsName(null)
      setShowConfirmation(false)
      if (trimmed.length > 0) {
        setError('Enter a valid Ethereum address (0x...) or ENS name (name.eth)')
      } else {
        setError(null)
      }
    }
  }, [manualInput, mode, publicClient])

  const handleModeChange = (_event: React.ChangeEvent<HTMLInputElement>, value: string) => {
    setMode(value as RecipientMode)
    setError(null)
    setShowConfirmation(false)
  }

  const handleContactChange = (contactAddress: string) => {
    setSelectedContact(contactAddress)
    setError(null)
  }

  const handleConfirmAddress = () => {
    const recipient = getRecipient()
    if (recipient) {
      // Save to contacts if it's a manual entry
      if (mode === 'manual' && isAddress(recipient)) {
        const label = manualLabel.trim() || recipient
        addContact(recipient, label).catch(() => {})
      }
      // Update last used timestamp if it's a contact
      if (mode === 'contact' && selectedContact) {
        // touchContact is called when used; already added via addContact on manual
      }
      onConfirm?.(recipient)
    }
  }

  const selfAddress = address ? (address as `0x${string}`) : null

  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend">Recipient</FormLabel>

      <RadioGroup value={mode} onChange={handleModeChange}>
        {/* Option 1: Send to me (default) */}
        <FormControlLabel
          value="self"
          control={<Radio />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Send to my account</Typography>
              {selfAddress && (
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  ({truncateAddress(selfAddress)})
                </Typography>
              )}
            </Box>
          }
        />

        {/* Option 2: Saved contact */}
        <FormControlLabel
          value="contact"
          control={<Radio />}
          label="Pick from a saved contact"
        />

        {mode === 'contact' && (
          <Box sx={{ ml: 4, mb: 2 }}>
            {contactsLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Loading contacts…</Typography>
              </Box>
            ) : contacts.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                No saved contacts yet. After you create a project with a custom recipient, the address will be saved here for future use.
              </Alert>
            ) : (
              <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                <Select
                  value={selectedContact}
                  displayEmpty
                  onChange={(e) => handleContactChange(e.target.value)}
                  renderValue={(value) => {
                    if (!value) return <Typography color="text.secondary">Select a contact…</Typography>
                    const contact = contacts.find(c => c.address === value)
                    return contact ? `${contact.label} (${truncateAddress(contact.address)})` : value
                  }}
                >
                  {contacts.map((contact) => (
                    <MenuItem key={contact.address} value={contact.address}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="body2">{contact.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', ml: 2 }}>
                          {truncateAddress(contact.address)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {/* Option 3: ENS / paste address */}
        <FormControlLabel
          value="manual"
          control={<Radio />}
          label="Enter an Ethereum address or ENS name"
        />

        {mode === 'manual' && (
          <Box sx={{ ml: 4, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="0x... or name.eth"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              sx={{ mt: 1 }}
              error={!!error && !ensResolving}
              slotProps={{
                input: {
                  endAdornment: ensResolving ? <CircularProgress size={16} /> : undefined,
                },
              }}
            />

            <TextField
              fullWidth
              size="small"
              label="Label (optional)"
              placeholder="e.g., First Baptist building fund"
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              sx={{ mt: 1 }}
              helperText="A name to save this recipient as for future projects"
            />

            {/* ENS confirmation */}
            {showConfirmation && ensResolvedAddress && ensName && (
              <Alert
                severity="info"
                sx={{ mt: 1 }}
                action={
                  <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={handleConfirmAddress}
                  >
                    Confirm
                  </Button>
                }
              >
                <Typography variant="body2">
                  <strong>{ensName}</strong> resolves to{' '}
                  <code style={{ fontSize: '0.85em' }}>{ensResolvedAddress}</code>
                </Typography>
                <Typography variant="caption">
                  Is this the right destination? Click "Confirm" to use this address.
                </Typography>
              </Alert>
            )}

            {/* Error display */}
            {error && !ensResolving && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}

            {/* Plain address entered (no ENS) — show quick confirm */}
            {mode === 'manual' &&
              isAddress(manualInput.trim()) &&
              !showConfirmation && (
              <Alert
                severity="info"
                sx={{ mt: 1 }}
                action={
                  <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => {
                      const recipient = manualInput.trim() as `0x${string}`
                      const label = manualLabel.trim() || recipient
                      addContact(recipient, label).catch(() => {})
                      onConfirm?.(recipient)
                    }}
                  >
                    Use This Address
                  </Button>
                }
              >
                <Typography variant="body2">
                  Using address: <code style={{ fontSize: '0.85em' }}>{truncateAddress(manualInput.trim())}</code>
                </Typography>
                <Typography variant="caption">
                  Make sure this is the correct destination — transactions cannot be reversed.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </RadioGroup>

      {/* Show the selected recipient when confirmed */}
      {getRecipient() && mode !== 'manual' && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Recipient: <code style={{ fontFamily: 'monospace' }}>{truncateAddress(getRecipient()!)}</code>
          </Typography>
        </Box>
      )}
    </FormControl>
  )
}
