import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Divider, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import type { ImplicationSourceActivity } from '@commonality/sdk/conceptspace'
import { loadTrustedAttesters, saveTrustedAttesters, useImplicationSourceActivity, type ImplicationSourceDiagnostic } from '../../../shared'
import { isValidAddress } from './settingsUtils'

function getDefaultAttesters(): string[] {
  const envDefault = import.meta.env.VITE_DEFAULT_TRUSTED_ATTESTERS
  if (typeof envDefault === 'string' && envDefault.trim()) {
    return envDefault.split(',').map((addr) => addr.trim()).filter(isValidAddress)
  }
  return []
}

/**
 * Commonality ships a default trusted source so the product's headline promise
 * renders on first contact. Labelling it keeps that honest: the user can see
 * they did not choose it, and can remove it.
 */
function isShippedDefault(address: string): boolean {
  return getDefaultAttesters().some((a) => a.toLowerCase() === address.toLowerCase())
}

/**
 * Sources publishing on this network that the user does not trust. Offered as
 * one-click adds so a misconfigured or empty trust list has an obvious repair,
 * rather than requiring the user to find an attester address by hand.
 */
function UntrustedActiveSources({
  diagnostic,
  trustedAttesters,
  onTrust,
}: {
  diagnostic: ImplicationSourceDiagnostic
  trustedAttesters: string[]
  onTrust: (address: string) => void
}) {
  if (diagnostic.status !== 'misconfigured' && diagnostic.status !== 'no-sources-configured') return null
  const trusted = new Set(trustedAttesters.map((a) => a.toLowerCase()))
  const candidates = (diagnostic.activity?.activeAttesters ?? []).filter((a) => !trusted.has(a.attester.toLowerCase()))
  if (candidates.length === 0) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" gutterBottom>Sources publishing on this network</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Commonality does not vouch for these — they are simply the addresses that have published statement connections here.
      </Typography>
      <List dense>{candidates.slice(0, 5).map(({ attester, implicationCount }) => (
        <ListItem key={attester} divider>
          <ListItemText
            primary={attester}
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
            secondary={`${implicationCount} connection${implicationCount !== 1 ? 's' : ''}`}
          />
          <ListItemSecondaryAction>
            <Button size="small" startIcon={<AddIcon />} onClick={() => onTrust(attester)}>Trust</Button>
          </ListItemSecondaryAction>
        </ListItem>
      ))}</List>
    </Box>
  )
}

/**
 * State-of-the-world banner for the configured sources.
 *
 * Replaces a hand-maintained "the official AI is not yet deployed" notice that
 * outlived the deployment it described and then misdirected a product review
 * into diagnosing a config bug as a missing feature. Everything here is derived
 * from the chain, so it cannot go stale.
 */
function SourceHealthAlert({
  diagnostic,
  configuredCount,
}: {
  diagnostic: ImplicationSourceDiagnostic
  configuredCount: number
}) {
  const { status, activity } = diagnostic
  if (status === 'loading' || status === 'unknown') return null

  if (status === 'no-implications-on-chain') {
    return <Alert severity="info" sx={{ mb: 3 }}>No statement connections have been published on this network yet, so indirect support will read zero no matter which sources you trust.</Alert>
  }

  if (status === 'no-sources-configured') {
    return <Alert severity="warning" sx={{ mb: 3 }}>You trust no sources, so indirect support reads zero everywhere. {activity?.activeAttesters.length ?? 0} source{(activity?.activeAttesters.length ?? 0) !== 1 ? 's have' : ' has'} published connections on this network — add one below to switch indirect support on.</Alert>
  }

  if (status === 'misconfigured') {
    return <Alert severity="error" sx={{ mb: 3 }}>None of your {configuredCount} trusted source{configuredCount !== 1 ? 's have' : ' has'} published any connections on this network, so indirect support reads zero everywhere. This usually means the address belongs to a different network's attester. Active sources on this network are listed below.</Alert>
  }

  return <Alert severity="success" sx={{ mb: 3 }}>Indirect support is active: at least one of your trusted sources has published on this network, where {activity?.totalImplications ?? 0} statement connection{(activity?.totalImplications ?? 0) !== 1 ? 's' : ''} exist in total.</Alert>
}

/** Per-source evidence: has this address actually published here, and how much? */
function SourceActivityCaption({
  address,
  activity,
}: {
  address: string
  activity: ImplicationSourceActivity | null
}) {
  if (!activity) return null
  const match = activity.activeAttesters.find((a) => a.attester.toLowerCase() === address.toLowerCase())
  if (!match) {
    return <Typography variant="caption" color="error">No connections published on this network — this source contributes nothing</Typography>
  }
  return <Typography variant="caption" color="text.secondary">{match.implicationCount} connection{match.implicationCount !== 1 ? 's' : ''} published on this network</Typography>
}

export function TrustedStatementSourcesSection() {
  const [trustedAttesters, setTrustedAttesters] = useState<string[]>([])
  const [newAttester, setNewAttester] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const diagnostic = useImplicationSourceActivity(trustedAttesters)

  useEffect(() => setTrustedAttesters(loadTrustedAttesters()), [])

  const handleTrustAddress = (address: string) => {
    setError(null)
    const updated = [...trustedAttesters, address]
    setTrustedAttesters(updated)
    saveTrustedAttesters(updated)
    setSuccessMessage('Added successfully')
  }

  const handleAddAttester = () => {
    setError(null)
    setSuccessMessage(null)
    const address = newAttester.trim()
    if (!address) return setError('Please enter an address')
    if (!isValidAddress(address)) return setError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.')
    if (trustedAttesters.some((a) => a.toLowerCase() === address.toLowerCase())) return setError('This address is already in your trusted list')
    handleTrustAddress(address)
    setNewAttester('')
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
      <SourceHealthAlert diagnostic={diagnostic} configuredCount={trustedAttesters.length} />
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
        <List>{trustedAttesters.map((address) => (
          <ListItem key={address} divider>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{address}</Box>
                  {isShippedDefault(address) && <Chip label="Shipped default" size="small" variant="outlined" />}
                </Box>
              }
              secondary={<SourceActivityCaption address={address} activity={diagnostic.activity} />}
            />
            <ListItemSecondaryAction><IconButton edge="end" aria-label="remove" onClick={() => handleRemoveAttester(address)} size="small"><DeleteIcon /></IconButton></ListItemSecondaryAction>
          </ListItem>
        ))}</List>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>{trustedAttesters.length} source{trustedAttesters.length !== 1 ? 's' : ''} configured</Typography>
      <UntrustedActiveSources diagnostic={diagnostic} trustedAttesters={trustedAttesters} onTrust={handleTrustAddress} />
    </Paper>
  )
}
