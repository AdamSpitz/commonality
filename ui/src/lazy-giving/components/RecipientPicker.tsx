import { AddressPicker } from '../../shared'

interface RecipientPickerProps {
  /** Connected wallet address */
  address: string | undefined
  /** Called with the chosen recipient address */
  onChange: (address: `0x${string}` | null) => void
  /** Called when a valid address is confirmed */
  onConfirm?: (address: `0x${string}`) => void
}

/**
 * The project-creation recipient field: {@link AddressPicker} with the
 * "where does the money land?" copy. See
 * specs/product/foolproof-project-creation.md.
 */
export function RecipientPicker({ address, onChange, onConfirm }: RecipientPickerProps) {
  return (
    <AddressPicker
      legend="Recipient"
      address={address}
      selfOptionLabel="Send to my account"
      contactKind="recipient"
      emptyContactsHint="No saved contacts yet. After you create a project with a custom recipient, the address will be saved here for future use."
      saveLabelHelperText="A name to save this recipient as for future projects"
      onChange={onChange}
      onConfirm={onConfirm}
    />
  )
}
