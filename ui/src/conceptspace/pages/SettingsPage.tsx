import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

const TRUSTED_ATTESTERS_KEY = 'commonality:trustedAttesters'

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function loadTrustedAttesters(): string[] {
  try {
    const stored = localStorage.getItem(TRUSTED_ATTESTERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidAddress)
      }
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveTrustedAttesters(attesters: string[]): void {
  localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify(attesters))
}

export function SettingsPage() {
  const [trustedAttesters, setTrustedAttesters] = useState<string[]>([])
  const [newAttester, setNewAttester] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load trusted attesters on mount
  useEffect(() => {
    setTrustedAttesters(loadTrustedAttesters())
  }, [])

  const handleAddAttester = () => {
    setError(null)
    setSuccessMessage(null)

    const address = newAttester.trim()

    if (!address) {
      setError('Please enter an address')
      return
    }

    if (!isValidAddress(address)) {
      setError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.')
      return
    }

    const normalizedAddress = address.toLowerCase()

    if (trustedAttesters.some(a => a.toLowerCase() === normalizedAddress)) {
      setError('This attester is already in your trusted list')
      return
    }

    const updated = [...trustedAttesters, address]
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setNewAttester('')
    setSuccessMessage('Attester added successfully')
  }

  const handleRemoveAttester = (address: string) => {
    const updated = trustedAttesters.filter(a => a !== address)
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setSuccessMessage('Attester removed')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddAttester()
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Trusted Implication Attesters
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Implication attesters evaluate whether believing one statement implies
          believing another. Add addresses of attesters you trust to include
          their attestations when calculating indirect support for statements.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          The official Commonality implication attester AI is not yet deployed.
          For now, you can add any Ethereum address that has published
          implication attestations to the Implications contract.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Attester Address"
            placeholder="0x..."
            value={newAttester}
            onChange={(e) => setNewAttester(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAttester}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {trustedAttesters.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No trusted attesters configured. Add an attester address above to see
            indirect support calculations.
          </Typography>
        ) : (
          <List>
            {trustedAttesters.map((address) => (
              <ListItem key={address} divider>
                <ListItemText
                  primary={address}
                  primaryTypographyProps={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="remove"
                    onClick={() => handleRemoveAttester(address)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {trustedAttesters.length} trusted attester{trustedAttesters.length !== 1 ? 's' : ''} configured
        </Typography>
      </Paper>
    </Box>
  )
}
