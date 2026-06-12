import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Divider, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, Slider, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import { loadBeatAgentTrustPolicy, saveBeatAgentTrustPolicy, type BeatAgentTrustPolicy } from '../../../shared/hooks/useBeatAgentTrustPolicy'
import { loadDefaultTrustedContentAttesters, loadTrustedContentAttesters, saveTrustedContentAttesters, type TrustedContentAttesterEntry, type TrustedContentAttesterKind } from '../../../shared/hooks/useTrustedContentAttesters'
import { isValidAddress } from './settingsUtils'

export function TrustedContentAttestersSection() {
  const [trustedContentAttesters, setTrustedContentAttesters] = useState<TrustedContentAttesterEntry[]>([])
  const [beatAgentTrustPolicy, setBeatAgentTrustPolicy] = useState<BeatAgentTrustPolicy>(loadBeatAgentTrustPolicy)
  const [newContentAttester, setNewContentAttester] = useState('')
  const [newContentAttesterName, setNewContentAttesterName] = useState('')
  const [newContentAttesterServiceUrl, setNewContentAttesterServiceUrl] = useState('')
  const [newContentAttesterKind, setNewContentAttesterKind] = useState<TrustedContentAttesterKind>('content-attester')
  const [contentAttesterError, setContentAttesterError] = useState<string | null>(null)
  const [contentAttesterSuccess, setContentAttesterSuccess] = useState<string | null>(null)

  useEffect(() => setTrustedContentAttesters(loadTrustedContentAttesters()), [])

  const handleAddContentAttester = () => {
    setContentAttesterError(null)
    setContentAttesterSuccess(null)
    const address = newContentAttester.trim()
    if (!address) return setContentAttesterError('Please enter an address')
    if (!isValidAddress(address)) return setContentAttesterError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.')
    if (trustedContentAttesters.some((a) => a.address.toLowerCase() === address.toLowerCase())) return setContentAttesterError('This address is already in your trusted content-attester list')
    const entry: TrustedContentAttesterEntry = { address, kind: newContentAttesterKind, name: newContentAttesterName.trim() || undefined, serviceUrl: newContentAttesterServiceUrl.trim() || undefined }
    const updated = [...trustedContentAttesters, entry]
    setTrustedContentAttesters(updated)
    saveTrustedContentAttesters(updated)
    setNewContentAttester('')
    setNewContentAttesterName('')
    setNewContentAttesterServiceUrl('')
    setContentAttesterSuccess(entry.kind === 'beat-agent' ? 'Added beat agent' : 'Added content attester')
  }

  const handleRemoveContentAttester = (entry: TrustedContentAttesterEntry) => {
    const updated = trustedContentAttesters.filter((a) => a.address !== entry.address)
    setTrustedContentAttesters(updated)
    saveTrustedContentAttesters(updated)
    setContentAttesterSuccess('Removed')
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><Typography variant="h6">Trusted content attestation sources</Typography><Chip icon={<FactCheckIcon />} label="Content attesters" size="small" variant="outlined" /></Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Content attesters and beat agents evaluate whether posts, videos, or articles match a statement. Beat agents are stateful content attesters that follow a particular beat and may cite local and ambient context in their reasoning. Add wallet addresses for the attester identities you trust.</Typography>
      {loadDefaultTrustedContentAttesters().length > 0 && trustedContentAttesters.length === 0 && <Alert severity="info" sx={{ mb: 3 }}>Using default trusted content-attester identities from environment.</Alert>}
      {contentAttesterError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setContentAttesterError(null)}>{contentAttesterError}</Alert>}
      {contentAttesterSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setContentAttesterSuccess(null)}>{contentAttesterSuccess}</Alert>}
      <ToggleButtonGroup value={newContentAttesterKind} exclusive onChange={(_, value: TrustedContentAttesterKind | null) => { if (value) setNewContentAttesterKind(value) }} sx={{ mb: 2 }}><ToggleButton value="content-attester">Stateless content attester</ToggleButton><ToggleButton value="beat-agent">Beat agent</ToggleButton></ToggleButtonGroup>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}><TextField fullWidth size="small" label="Wallet Address" placeholder="0x..." value={newContentAttester} onChange={(e) => setNewContentAttester(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddContentAttester() }} /><Button variant="contained" startIcon={<AddIcon />} onClick={handleAddContentAttester} sx={{ whiteSpace: 'nowrap' }}>Add</Button></Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}><TextField fullWidth size="small" label="Display name (optional)" placeholder="US politics beat agent" value={newContentAttesterName} onChange={(e) => setNewContentAttesterName(e.target.value)} /><TextField fullWidth size="small" label="Attester endpoint (optional)" placeholder="https://attester.example.com" value={newContentAttesterServiceUrl} onChange={(e) => setNewContentAttesterServiceUrl(e.target.value)} /></Box>
      <Divider sx={{ mb: 2 }} />
      {trustedContentAttesters.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No trusted content attestation sources configured yet.</Typography> : <List>{trustedContentAttesters.map((entry) => <ListItem key={entry.address} divider><ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}><Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{entry.address}</Typography><Chip label={entry.kind === 'beat-agent' ? 'Beat agent' : 'Content attester'} size="small" color={entry.kind === 'beat-agent' ? 'primary' : 'default'} variant="outlined" />{entry.name && <Chip label={entry.name} size="small" variant="outlined" />}</Box>} secondary={entry.serviceUrl ?? null} /><ListItemSecondaryAction><IconButton edge="end" aria-label="remove" onClick={() => handleRemoveContentAttester(entry)} size="small"><DeleteIcon /></IconButton></ListItemSecondaryAction></ListItem>)}</List>}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>{trustedContentAttesters.length} content source{trustedContentAttesters.length !== 1 ? 's' : ''} configured</Typography>
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" gutterBottom>Beat-agent ambient-context trust policy</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Attestations from beat agents are flagged when any ambient-context citation has a diversity score below this threshold. A score of 0 disables the filter; a score of 0.5 or higher is a good starting point for stricter trust requirements. Diversity scores are visible in the audit dialog for each beat-agent chip.</Typography>
      <Box sx={{ px: 1 }}><Typography variant="body2" gutterBottom>Minimum ambient-context diversity: <strong>{beatAgentTrustPolicy.minAmbientDiversityThreshold === 0 ? 'off (no filter)' : beatAgentTrustPolicy.minAmbientDiversityThreshold.toFixed(2)}</strong></Typography><Slider value={beatAgentTrustPolicy.minAmbientDiversityThreshold} min={0} max={1} step={0.05} marks={[{ value: 0, label: 'Off' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1.0' }]} valueLabelDisplay="auto" valueLabelFormat={(v) => v === 0 ? 'off' : v.toFixed(2)} onChange={(_, value) => { const threshold = typeof value === 'number' ? value : value[0]; const newPolicy = { ...beatAgentTrustPolicy, minAmbientDiversityThreshold: threshold }; setBeatAgentTrustPolicy(newPolicy); saveBeatAgentTrustPolicy(newPolicy) }} sx={{ maxWidth: 400 }} /></Box>
    </Paper>
  )
}
