import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import type { AllowedPaymentToken } from './useAllowedPaymentTokens'

export function PaymentTokenPicker({
  tokens,
  value,
  onChange,
  label = 'Settlement token',
}: {
  tokens: AllowedPaymentToken[]
  value: string | null
  onChange: (address: string) => void
  label?: string
}) {
  if (tokens.length <= 1) return null
  return (
    <FormControl fullWidth size="small" sx={{ maxWidth: 480 }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value ?? ''} onChange={(event) => onChange(String(event.target.value))}>
        {tokens.map((token) => (
          <MenuItem key={token.address} value={token.address}>{token.address}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
