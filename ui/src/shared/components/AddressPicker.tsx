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
import { truncateAddress } from '../utils/address'
import { getContacts, addContact, type ContactKind, type SavedContact } from '../stores/contactStore'
import { useResolvedAddress, type ResolvedAddress } from '../hooks/useResolvedAddress'

type PickerMode = 'self' | 'contact' | 'manual'

/**
 * Why the field currently has no address, so callers can tell "nothing entered"
 * apart from "entered something we could not turn into an address" — the latter
 * must block submission rather than silently proceed as if the field were blank.
 */
export type AddressPickerStatus = 'empty' | 'valid' | 'invalid' | 'resolving'

export interface AddressPickerProps {
  /** Fieldset legend, e.g. "Recipient" or "Delegate". */
  legend: string
  /** Connected wallet address, used by the "self" mode. */
  address: string | undefined
  /**
   * Label for the "use my own account" option. Omit it for fields where
   * pointing at yourself is meaningless (you do not delegate to yourself).
   */
  selfOptionLabel?: string
  /** Which saved-contact list this field reads from and writes to. */
  contactKind: ContactKind
  contactOptionLabel?: string
  manualOptionLabel?: string
  /** Shown when the contact list for this kind is empty. */
  emptyContactsHint?: string
  /** Helper text under the optional label field. */
  saveLabelHelperText?: string
  /** Caution shown alongside a manually-typed address. */
  manualConfirmWarning?: string
  /**
   * Called with the chosen address, or null when the field has no valid value.
   * The status distinguishes blank from unparseable — see
   * {@link AddressPickerStatus}.
   */
  onChange: (address: `0x${string}` | null, status: AddressPickerStatus) => void
  /** Called when the user explicitly confirms a manually-entered address. */
  onConfirm?: (address: `0x${string}`) => void
  disabled?: boolean
}

function ContactChooser({
  contacts,
  loading,
  emptyHint,
  selected,
  onSelect,
}: {
  contacts: SavedContact[]
  loading: boolean
  emptyHint: string
  selected: string
  onSelect: (address: string) => void
}) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2">Loading contacts…</Typography>
      </Box>
    )
  }

  if (contacts.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 1 }}>
        {emptyHint}
      </Alert>
    )
  }

  return (
    <FormControl size="small" fullWidth sx={{ mt: 1 }}>
      <Select
        value={selected}
        displayEmpty
        onChange={(e) => onSelect(e.target.value)}
        renderValue={(value) => {
          if (!value) return <Typography color="text.secondary">Select a contact…</Typography>
          const contact = contacts.find((c) => c.address === value)
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
  )
}

function ManualEntry({
  input,
  onInputChange,
  label,
  onLabelChange,
  saveLabelHelperText,
  confirmWarning,
  resolution,
  onUse,
}: {
  input: string
  onInputChange: (value: string) => void
  label: string
  onLabelChange: (value: string) => void
  saveLabelHelperText: string
  confirmWarning: string
  resolution: ResolvedAddress
  onUse: (address: `0x${string}`) => void
}) {
  const resolved = resolution.address

  return (
    <>
      <TextField
        fullWidth
        size="small"
        placeholder="0x... or name.eth"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        sx={{ mt: 1 }}
        error={!!resolution.error && !resolution.resolving}
        slotProps={{
          input: {
            endAdornment: resolution.resolving ? <CircularProgress size={16} /> : undefined,
          },
        }}
      />

      <TextField
        fullWidth
        size="small"
        label="Label (optional)"
        placeholder="e.g., First Baptist building fund"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        sx={{ mt: 1 }}
        helperText={saveLabelHelperText}
      />

      {/* An ENS name resolved to something — that indirection is what needs confirming. */}
      {resolved && resolution.ensName && (
        <Alert
          severity="info"
          sx={{ mt: 1 }}
          action={
            <Button size="small" color="primary" variant="outlined" onClick={() => onUse(resolved)}>
              Confirm
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>{resolution.ensName}</strong> resolves to{' '}
            <code style={{ fontSize: '0.85em' }}>{resolved}</code>
          </Typography>
          <Typography variant="caption">
            Is this the right destination? Click "Confirm" to use this address.
          </Typography>
        </Alert>
      )}

      {resolution.error && !resolution.resolving && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {resolution.error}
        </Alert>
      )}

      {resolved && !resolution.ensName && (
        <Alert
          severity="info"
          sx={{ mt: 1 }}
          action={
            <Button size="small" color="primary" variant="outlined" onClick={() => onUse(resolved)}>
              Use This Address
            </Button>
          }
        >
          <Typography variant="body2">
            Using address: <code style={{ fontSize: '0.85em' }}>{truncateAddress(resolved)}</code>
          </Typography>
          <Typography variant="caption">{confirmWarning}</Typography>
        </Alert>
      )}
    </>
  )
}

/**
 * Layered address picker — the same three-tier idea as the project-creation
 * recipient field, generalized so every human-pointing field in the product can
 * use it instead of a bare `0x…` text box:
 *
 * 1. Your own account (optional; the safe default where it applies)
 * 2. A saved contact — the real guardrail, since vetting happens once
 * 3. ENS name or pasted address, with a plain-language confirmation
 *
 * See specs/product/foolproof-project-creation.md for why the layering is
 * ordered this way, and specs/product/use-cases.md (D1/D2/D3) for why it is
 * shared rather than per-field.
 */
export function AddressPicker({
  legend,
  address,
  selfOptionLabel,
  contactKind,
  contactOptionLabel = 'Pick from a saved contact',
  manualOptionLabel = 'Enter an Ethereum address or ENS name',
  emptyContactsHint = 'No saved contacts yet. Addresses you enter and confirm here are saved for next time.',
  saveLabelHelperText = 'A name to save this address as for future use',
  manualConfirmWarning = 'Make sure this is the correct destination — transactions cannot be reversed.',
  onChange,
  onConfirm,
  disabled = false,
}: AddressPickerProps) {
  const hasSelfOption = selfOptionLabel !== undefined

  const [mode, setMode] = useState<PickerMode>(hasSelfOption ? 'self' : 'manual')
  const [contacts, setContacts] = useState<SavedContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [manualInput, setManualInput] = useState('')
  const [manualLabel, setManualLabel] = useState('')
  // Once the user picks a mode, stop letting the contact load move them.
  const modeChosenByUser = useRef(false)

  const resolution = useResolvedAddress(manualInput, { enabled: mode === 'manual' })

  const loadContacts = useCallback(async () => {
    try {
      setContactsLoading(true)
      const loaded = await getContacts(contactKind)
      setContacts(loaded)
      // Without a "self" default, saved contacts are the friendliest landing
      // spot — but only if there are any.
      if (!hasSelfOption && !modeChosenByUser.current && loaded.length > 0) {
        setMode('contact')
      }
    } catch (err) {
      console.error('Error loading contacts:', err)
    } finally {
      setContactsLoading(false)
    }
  }, [contactKind, hasSelfOption])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const getSelected = useCallback((): `0x${string}` | null => {
    if (mode === 'self') return address ? (address as `0x${string}`) : null
    if (mode === 'contact' && selectedContact) return selectedContact as `0x${string}`
    if (mode === 'manual') return resolution.address
    return null
  }, [mode, address, selectedContact, resolution.address])

  const status: AddressPickerStatus = getSelected()
    ? 'valid'
    : mode === 'manual'
      ? resolution.resolving
        ? 'resolving'
        : manualInput.trim().length > 0
          ? 'invalid'
          : 'empty'
      : 'empty'

  useEffect(() => {
    onChange(getSelected(), status)
  }, [getSelected, onChange, status])

  const handleModeChange = (_event: React.ChangeEvent<HTMLInputElement>, value: string) => {
    modeChosenByUser.current = true
    setMode(value as PickerMode)
  }

  const handleSave = (chosen: `0x${string}`) => {
    addContact(chosen, manualLabel.trim() || chosen, contactKind)
      .then(() => loadContacts())
      .catch(() => {})
    onConfirm?.(chosen)
  }

  const selfAddress = address ? (address as `0x${string}`) : null
  const selected = getSelected()

  return (
    <FormControl component="fieldset" fullWidth disabled={disabled}>
      <FormLabel component="legend">{legend}</FormLabel>

      <RadioGroup value={mode} onChange={handleModeChange}>
        {hasSelfOption && (
          <FormControlLabel
            value="self"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{selfOptionLabel}</Typography>
                {selfAddress && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    ({truncateAddress(selfAddress)})
                  </Typography>
                )}
              </Box>
            }
          />
        )}

        <FormControlLabel value="contact" control={<Radio />} label={contactOptionLabel} />

        {mode === 'contact' && (
          <Box sx={{ ml: 4, mb: 2 }}>
            <ContactChooser
              contacts={contacts}
              loading={contactsLoading}
              emptyHint={emptyContactsHint}
              selected={selectedContact}
              onSelect={setSelectedContact}
            />
          </Box>
        )}

        <FormControlLabel value="manual" control={<Radio />} label={manualOptionLabel} />

        {mode === 'manual' && (
          <Box sx={{ ml: 4, mb: 2 }}>
            <ManualEntry
              input={manualInput}
              onInputChange={setManualInput}
              label={manualLabel}
              onLabelChange={setManualLabel}
              saveLabelHelperText={saveLabelHelperText}
              confirmWarning={manualConfirmWarning}
              resolution={resolution}
              onUse={handleSave}
            />
          </Box>
        )}
      </RadioGroup>

      {selected && mode !== 'manual' && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {legend}: <code style={{ fontFamily: 'monospace' }}>{truncateAddress(selected)}</code>
          </Typography>
        </Box>
      )}
    </FormControl>
  )
}
