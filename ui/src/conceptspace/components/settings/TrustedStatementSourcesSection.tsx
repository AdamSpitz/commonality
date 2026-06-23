import { useEffect, useState } from 'react'
import { Alert, Box, Button, Divider, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { loadTrustedAttesters, saveTrustedAttesters } from '../../../shared'
import { isValidAddress } from './settingsUtils'

function getDefaultAttesters(): string[] {
  const envDefault = import.meta.env.VITE_DEFAULT_TRUSTED_ATTESTERS
  if (typeof envDefault === 'string' && envDefault.trim()) {
    return envDefault.split(',').map((addr) => addr.trim()).filter(isValidAddress)
  }
  return []
}

export function TrustedStatementSourcesSection() {
  const [trustedAttesters, setTrustedAttesters] = useState<string[]>([])
  const [newAttester, setNewAttester] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => setTrustedAttesters(loadTrustedAttesters()), [])

  const handleAddAttester = () => {
    setError(null)
    setSuccessMessage(null)
    const address = newAttester.trim()
    if (!address) return setError('Please enter an address')
    if (!isValidAddress(address)) return setError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.')
    if (trustedAttesters.some((a) => a.toLowerCase() === address.toLowerCase())) return setError('This address is already in your trusted list')
    const updated = [...trustedAttesters, address]
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setNewAttester('')
    setSuccessMessage('Added successfully')
  }

  const handleRemoveAttester = (address: string) => {
    const updated = trustedAttesters.filter((a) => a !== address)
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setSuccessMessage('Removed')
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Trusted statement-connection sources</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Statement-connection sources are AI services (or human curators) that evaluate whether agreeing with one statement likely means you'd also agree with another. Add wallet addresses of sources you trust to include their connections when calculating indirect support for statements.
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>The official Commonality statement-connection AI is not yet deployed. For now, you can add any wallet address that has published statement connections to the Implications contract.</Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField fullWidth size="small" label="Wallet Address" placeholder="0x..." value={newAttester} onChange={(e) => setNewAttester(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddAttester() }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddAttester} sx={{ whiteSpace: 'nowrap' }}>Add</Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {trustedAttesters.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No sources configured yet. Add a wallet address above to see indirect support calculations.</Typography>
      ) : (
        <List>{trustedAttesters.map((address) => <ListItem key={address} divider><ListItemText primary={address} primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }} /><ListItemSecondaryAction><IconButton edge="end" aria-label="remove" onClick={() => handleRemoveAttester(address)} size="small"><DeleteIcon /></IconButton></ListItemSecondaryAction></ListItem>)}</List>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>{trustedAttesters.length} source{trustedAttesters.length !== 1 ? 's' : ''} configured</Typography>
      {getDefaultAttesters().length > 0 && trustedAttesters.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>Using default attester addresses from environment: {getDefaultAttesters().join(', ')}</Alert>}
    </Paper>
  )
}
