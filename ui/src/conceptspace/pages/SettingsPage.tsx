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
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { useAccount } from 'wagmi'
import { getUserSocialData } from '@commonality/sdk'
import { loadTrustedAttesters, saveTrustedAttesters } from '../../shared/hooks/useTrustedAttesters'
import { loadDefaultNudgers, loadTrustedNudgers, saveTrustedNudgers, type TrustedNudgerEntry } from '../../shared/hooks/useTrustedNudgers'
import { useNudgeIntensity, type NudgeIntensity } from '../../shared/hooks/useNudgeIntensity'
import { useMutedTopics } from '../../shared/hooks/useMutedTopics'
import { DirectTrustSettingsSection } from '../components/DirectTrustSettingsSection'
import { useClaimFlow } from '../../content-funding/hooks/useClaimFlow'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { loadTwitterHandleHint, saveTwitterHandleHint } from '../twitterHandleHints'

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function getDefaultAttesters(): string[] {
  const envDefault = import.meta.env.VITE_DEFAULT_TRUSTED_ATTESTERS
  if (typeof envDefault === 'string' && envDefault.trim()) {
    return envDefault
      .split(',')
      .map((addr) => addr.trim())
      .filter(isValidAddress)
  }
  return []
}


export function SettingsPage() {
  const { address, isConnected } = useAccount()
  const machinery = useMachinery()
  const { getChallenge, confirmVerification, loading: verificationLoading, error: verificationError, clearError } = useClaimFlow()
  const { intensity, setIntensity } = useNudgeIntensity()
  const { mutedTopics, addTopic, removeTopic } = useMutedTopics()

  const [trustedAttesters, setTrustedAttesters] = useState<string[]>([])
  const [newAttester, setNewAttester] = useState('')
  const [trustedNudgers, setTrustedNudgers] = useState<TrustedNudgerEntry[]>([])
  const [newNudger, setNewNudger] = useState('')
  const [newNudgerUrl, setNewNudgerUrl] = useState('')
  const [newMutedTopic, setNewMutedTopic] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [nudgerError, setNudgerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [nudgerSuccess, setNudgerSuccess] = useState<string | null>(null)
  const [twitterHandle, setTwitterHandle] = useState('')
  const [twitterAssociationStatus, setTwitterAssociationStatus] = useState<string | null>(null)
  const [twitterAssociationError, setTwitterAssociationError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<{ nonce: string; verificationPostTemplate: string } | null>(null)
  const [confirmingTwitterLink, setConfirmingTwitterLink] = useState(false)

  useEffect(() => {
    setTrustedAttesters(loadTrustedAttesters())
  }, [])

  useEffect(() => {
    setTrustedNudgers(loadTrustedNudgers())
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
      setError('This address is already in your trusted list')
      return
    }

    const updated = [...trustedAttesters, address]
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setNewAttester('')
    setSuccessMessage('Added successfully')
  }

  const handleRemoveAttester = (address: string) => {
    const updated = trustedAttesters.filter(a => a !== address)
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setSuccessMessage('Removed')
  }

  const handleAddNudger = async () => {
    setNudgerError(null)
    setNudgerSuccess(null)

    const address = newNudger.trim()

    if (!address) {
      setNudgerError('Please enter an address')
      return
    }

    if (!isValidAddress(address)) {
      setNudgerError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.')
      return
    }

    const normalizedAddress = address.toLowerCase()

    if (trustedNudgers.some(n => n.address.toLowerCase() === normalizedAddress)) {
      setNudgerError('This address is already in your nudger list')
      return
    }

    const serviceUrl = newNudgerUrl.trim() || undefined

    const entry: TrustedNudgerEntry = { address, serviceUrl }

    if (serviceUrl) {
      const meta = await fetch(`${serviceUrl.replace(/\/+$/, '')}/.well-known/nudger.json`).catch(() => null)
      if (meta && meta.ok) {
        const data = await meta.json().catch(() => null)
        if (data) {
          entry.name = data.name
          entry.description = data.description
          entry.sourceType = data.sourceType
          entry.version = data.version
        }
      }
    }

    const updated = [...trustedNudgers, entry]
    setTrustedNudgers(updated)
    saveTrustedNudgers(updated)
    setNewNudger('')
    setNewNudgerUrl('')
    setNudgerSuccess(entry.name ? `Added ${entry.name}` : 'Added successfully')
  }

  const handleRemoveNudger = (entry: TrustedNudgerEntry) => {
    const updated = trustedNudgers.filter(n => n.address !== entry.address)
    setTrustedNudgers(updated)
    saveTrustedNudgers(updated)
    setNudgerSuccess('Removed')
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
          Link your Twitter / X account to your wallet using the same
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
          Trusted statement-connection sources
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Statement-connection sources are AI services (or human curators) that
          evaluate whether agreeing with one statement likely means you'd also
          agree with another. Add wallet addresses of sources you trust to
          include their connections when calculating indirect support for statements.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          The official Commonality statement-connection AI is not yet deployed.
          For now, you can add any wallet address that has published
          statement connections to the Implications contract.
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
            label="Wallet Address"
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
            No sources configured yet. Add a wallet address above to see
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
          {trustedAttesters.length} source{trustedAttesters.length !== 1 ? 's' : ''} configured
        </Typography>

        {getDefaultAttesters().length > 0 && trustedAttesters.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Using default attester addresses from environment: {getDefaultAttesters().join(', ')}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6">
            Nudger addresses
          </Typography>
          <Chip icon={<AutoFixHighIcon />} label="Nudgers" size="small" variant="outlined" />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Nudgers are services that suggest statements you might want to believe
          based on your current beliefs. Add wallet addresses of nudgers you trust
          to receive personalized statement suggestions.
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Suggestion intensity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Control how prominently nudges appear. Low shows at most 3 suggestions per statement,
          medium shows up to 5, and high shows up to 10.
        </Typography>

        <ToggleButtonGroup
          value={intensity}
          exclusive
          onChange={(_, value: NudgeIntensity | null) => {
            if (value) setIntensity(value)
          }}
          sx={{ mb: 3 }}
        >
          <ToggleButton value="low">Low</ToggleButton>
          <ToggleButton value="medium">Medium</ToggleButton>
          <ToggleButton value="high">High</ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Muted topics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Nudges about these topics will not be shown. Add topics you are not interested in.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Topic"
            placeholder="e.g., crypto, education, healthcare"
            value={newMutedTopic}
            onChange={(e) => setNewMutedTopic(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && newMutedTopic.trim()) {
                addTopic(newMutedTopic)
                setNewMutedTopic('')
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              if (newMutedTopic.trim()) {
                addTopic(newMutedTopic)
                setNewMutedTopic('')
              }
            }}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Box>

        {mutedTopics.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {mutedTopics.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                onDelete={() => removeTopic(topic)}
                size="small"
              />
            ))}
          </Box>
        )}

        {loadDefaultNudgers().length > 0 && trustedNudgers.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              Default nudgers from environment:
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              {loadDefaultNudgers().map((entry) => (
                <Chip
                  key={entry.address}
                  label={entry.name ?? entry.address}
                  size="small"
                  sx={{ mr: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
              ))}
            </Typography>
          </Alert>
        )}

        {nudgerError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setNudgerError(null)}>
            {nudgerError}
          </Alert>
        )}

        {nudgerSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNudgerSuccess(null)}>
            {nudgerSuccess}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Wallet Address"
            placeholder="0x..."
            value={newNudger}
            onChange={(e) => setNewNudger(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') handleAddNudger()
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNudger}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Optionally provide the nudger service URL to discover its name and description.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Service URL (optional)"
            placeholder="http://localhost:3002"
            value={newNudgerUrl}
            onChange={(e) => setNewNudgerUrl(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') handleAddNudger()
            }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {trustedNudgers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No nudgers configured yet. Add a wallet address above to receive
            personalized statement suggestions.
          </Typography>
        ) : (
          <List>
            {trustedNudgers.map((entry) => (
              <ListItem key={entry.address} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }}
                      >
                        {entry.address}
                      </Typography>
                      {entry.name && (
                        <Chip label={entry.name} size="small" color="primary" variant="outlined" />
                      )}
                      {entry.sourceType && (
                        <Chip label={entry.sourceType} size="small" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={
                    entry.description ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {entry.description}
                      </Typography>
                    ) : null
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="remove"
                    onClick={() => handleRemoveNudger(entry)}
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
          {trustedNudgers.length} nudger{trustedNudgers.length !== 1 ? 's' : ''} configured
        </Typography>

        {loadDefaultNudgers().length > 0 && trustedNudgers.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Also using {loadDefaultNudgers().length} default nudger{loadDefaultNudgers().length !== 1 ? 's' : ''} from environment.
          </Alert>
        )}
      </Paper>

      <DirectTrustSettingsSection />
    </Box>
  )
}
