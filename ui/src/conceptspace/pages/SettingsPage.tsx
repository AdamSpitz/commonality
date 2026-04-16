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
  CircularProgress,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useAccount } from 'wagmi'
import { getUserSocialData } from '@commonality/sdk'
import { TRUSTED_ATTESTERS_KEY, loadTrustedAttesters } from '../../shared/hooks/useTrustedAttesters'
import { DirectTrustSettingsSection } from '../components/DirectTrustSettingsSection'
import { useClaimFlow } from '../../content-funding/hooks/useClaimFlow'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { loadTwitterHandleHint, saveTwitterHandleHint } from '../twitterHandleHints'

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function saveTrustedAttesters(attesters: string[]): void {
  localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify(attesters))
}

export function SettingsPage() {
  const { address, isConnected } = useAccount()
  const machinery = useMachinery()
  const { getChallenge, confirmVerification, loading: verificationLoading, error: verificationError, clearError } = useClaimFlow()

  const [trustedAttesters, setTrustedAttesters] = useState<string[]>([])
  const [newAttester, setNewAttester] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [twitterHandle, setTwitterHandle] = useState('')
  const [twitterAssociationStatus, setTwitterAssociationStatus] = useState<string | null>(null)
  const [twitterAssociationError, setTwitterAssociationError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<{ nonce: string; verificationPostTemplate: string } | null>(null)
  const [confirmingTwitterLink, setConfirmingTwitterLink] = useState(false)

  useEffect(() => {
    setTrustedAttesters(loadTrustedAttesters())
  }, [])

  useEffect(() => {
    if (!address) {
      setTwitterHandle('')
      setTwitterAssociationStatus(null)
      setChallenge(null)
      return
    }

    const savedHandle = loadTwitterHandleHint(address) ?? ''
    setTwitterHandle(savedHandle)

    if (!savedHandle) {
      setTwitterAssociationStatus(null)
      return
    }

    let cancelled = false

    getUserSocialData(machinery, address, { twitterHandleHint: savedHandle })
      .then((data) => {
        if (cancelled) return
        setTwitterAssociationStatus(data?.isTwitterVerified
          ? `Linked via channel registry as ${data.twitterHandle ?? savedHandle}`
          : null)
      })
      .catch(() => {
        if (!cancelled) {
          setTwitterAssociationStatus(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [address, machinery])

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

  const handleGetTwitterChallenge = async () => {
    if (!address) return

    setTwitterAssociationError(null)
    clearError()

    const normalizedHandle = twitterHandle.trim()
    if (!normalizedHandle) {
      setTwitterAssociationError('Please enter your Twitter / X handle first.')
      return
    }

    const result = await getChallenge('twitter', normalizedHandle, address)
    if (result) {
      setChallenge({
        nonce: result.nonce,
        verificationPostTemplate: result.verificationPostTemplate,
      })
    }
  }

  const handleConfirmTwitterLink = async () => {
    if (!challenge || !address) return

    setConfirmingTwitterLink(true)
    setTwitterAssociationError(null)

    try {
      const result = await confirmVerification(challenge.nonce)
      if (!result) {
        setTwitterAssociationError('Verification failed. Please make sure you posted the verification tweet.')
        return
      }

      saveTwitterHandleHint(address, twitterHandle)
      const socialData = await getUserSocialData(machinery, address, { twitterHandleHint: twitterHandle.trim() })
      setTwitterAssociationStatus(
        socialData?.isTwitterVerified
          ? `Linked via channel registry as ${socialData.twitterHandle ?? twitterHandle.trim()}`
          : 'Verification succeeded, but the linked account has not shown up in local event data yet.',
      )
      setChallenge(null)
    } catch (err) {
      setTwitterAssociationError(err instanceof Error ? err.message : 'Failed to confirm Twitter verification')
    } finally {
      setConfirmingTwitterLink(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Trust Settings
      </Typography>

      <Alert severity="info" sx={{ mt: 2 }}>
        Most new users can ignore this page at first. It is for customizing whose
        attestations and trust relationships you want the app to rely on.
      </Alert>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Linked social accounts
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Link your Twitter / X account to your Ethereum address using the same
          verification flow the content-funding claim page already uses.
        </Typography>

        {!isConnected || !address ? (
          <Alert severity="info">
            Connect your wallet to link your Twitter / X account.
          </Alert>
        ) : (
          <>
            {twitterAssociationStatus && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {twitterAssociationStatus}
              </Alert>
            )}

            {(twitterAssociationError || verificationError) && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => {
                setTwitterAssociationError(null)
                clearError()
              }}>
                {twitterAssociationError ?? verificationError?.message}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                size="small"
                label="Twitter / X handle"
                placeholder="@alice"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleGetTwitterChallenge}
                disabled={verificationLoading || confirmingTwitterLink}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {verificationLoading ? <CircularProgress size={24} /> : 'Get verification tweet'}
              </Button>
            </Box>

            {challenge && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Tweet text"
                  value={challenge.verificationPostTemplate}
                  multiline
                  rows={3}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <Button
                  variant="outlined"
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(challenge.verificationPostTemplate)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open X to Tweet
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmTwitterLink}
                  disabled={verificationLoading || confirmingTwitterLink}
                >
                  {confirmingTwitterLink ? <CircularProgress size={24} /> : 'I tweeted it'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Trusted implication attesters
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

      <DirectTrustSettingsSection />
    </Box>
  )
}
