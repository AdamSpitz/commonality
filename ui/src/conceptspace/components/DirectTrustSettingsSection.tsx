import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import {
  TrustRegistryAbi,
  getDirectTrustMapping,
  setTrust,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useWriteClients } from '../../shared/hooks/useWriteClients'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'
import { notifySubjectivTrustNetworkInvalidated } from '../../shared/subjectivTrust'

function normalizeEntries(entries: Map<string, number>) {
  return Array.from(entries.entries())
    .map(([trustee, score]) => ({ trustee, score }))
    .sort((a, b) => b.score - a.score || a.trustee.localeCompare(b.trustee))
}

export function DirectTrustSettingsSection() {
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const {
    trustedSet,
    isLoading: trustedSetLoading,
    error: trustedSetError,
    refreshTrustedSet,
  } = useTrustedSet(address)

  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<Array<{ trustee: string; score: number }>>([])
  const [newTrustee, setNewTrustee] = useState('')
  const [newScore, setNewScore] = useState('100')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const trustRegistryContract = useMemo(() => {
    const contractAddress = import.meta.env.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS as `0x${string}` | undefined
    if (!contractAddress) return null
    return {
      address: contractAddress,
      abi: TrustRegistryAbi,
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address) {
        setEntries([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const directTrust = await getDirectTrustMapping(machinery, address)
        if (!cancelled) {
          setEntries(normalizeEntries(directTrust))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load direct trust settings')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [address, machinery, refreshKey])

  const getClients = () => {
    if (!writeClients || !address) return null
    return writeClients
  }

  const handleSaveTrust = async () => {
    setError(null)
    setSuccessMessage(null)

    const trustee = newTrustee.trim().toLowerCase()
    const score = Number(newScore)

    if (!trustRegistryContract) {
      setError('Trust registry contract not configured (VITE_TRUST_REGISTRY_CONTRACT_ADDRESS)')
      return
    }

    if (!isAddress(trustee)) {
      setError('Please enter a valid wallet address')
      return
    }

    if (!Number.isInteger(score) || score < 1 || score > 100) {
      setError('Trust score must be an integer from 1 to 100')
      return
    }

    const clients = getClients()
    if (!clients) {
      setError('Wallet not connected')
      return
    }

    try {
      await setTrust(clients, trustRegistryContract, trustee, score)
      setNewTrustee('')
      setNewScore('100')
      setSuccessMessage('Direct trust updated')
      notifySubjectivTrustNetworkInvalidated()
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update direct trust')
    }
  }

  const handleRemoveTrust = async (trustee: string) => {
    setError(null)
    setSuccessMessage(null)

    if (!trustRegistryContract) {
      setError('Trust registry contract not configured (VITE_TRUST_REGISTRY_CONTRACT_ADDRESS)')
      return
    }

    const clients = getClients()
    if (!clients) {
      setError('Wallet not connected')
      return
    }

    try {
      await setTrust(clients, trustRegistryContract, trustee as `0x${string}`, 0)
      setSuccessMessage('Direct trust removed')
      notifySubjectivTrustNetworkInvalidated()
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove direct trust')
    }
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Your Trust Network
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Project endorsements are filtered through your personal trust network rather than
        a single approved source. Add trust scores here, and project pages will
        follow those trust links and filter based on the accounts discovered so far.
      </Typography>

      {!isConnected ? (
        <Alert severity="info">
          Connect your wallet to manage trust scores for filtering project endorsements.
        </Alert>
      ) : (
        <>
          {trustedSetError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {trustedSetError}
            </Alert>
          )}

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
              label="Wallet Address"
              placeholder="0x..."
              value={newTrustee}
              onChange={(e) => setNewTrustee(e.target.value)}
            />
            <TextField
              size="small"
              label="Score"
              type="number"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              inputProps={{ min: 1, max: 100, step: 1 }}
              sx={{ width: 110 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleSaveTrust}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refreshTrustedSet}
              disabled={trustedSetLoading}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Refresh Network
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No direct trust scores yet. Until you add some, project pages will show
              all project endorsements.
            </Typography>
          ) : (
            <List>
              {entries.map(({ trustee, score }) => (
                <ListItem key={trustee} divider>
                  <ListItemText
                    primary={trustee}
                    secondary={`Trust score: ${score}`}
                    primaryTypographyProps={{
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Chip label={score} size="small" sx={{ mr: 1 }} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label={`remove ${trustee}`}
                      onClick={() => handleRemoveTrust(trustee)}
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
            {entries.length} direct trust score{entries.length !== 1 ? 's' : ''} configured
          </Typography>

          {trustedSetLoading ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {trustedSet
                ? `Refreshing your trust network. Currently using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network.`
                : 'Refreshing your trust network. Until any trusted accounts are found, project pages still show all project endorsements.'}
            </Typography>
          ) : trustedSet ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Current network size: {trustedSet.size} account{trustedSet.size !== 1 ? 's' : ''}
            </Typography>
          ) : null}
        </>
      )}
    </Paper>
  )
}
