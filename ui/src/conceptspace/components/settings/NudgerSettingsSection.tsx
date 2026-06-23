import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Chip, Divider, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DeleteIcon from '@mui/icons-material/Delete'
import { useMutedNudgers } from '../../../shared'
import { useMutedTopics } from '../../../shared'
import { useNudgeIntensity, type NudgeIntensity } from '../../../shared'
import { addTrustedNudger, isValidNudgerAddress, loadDefaultNudgers, loadTrustedNudgers, saveTrustedNudgers, type TrustedNudgerEntry } from '../../../shared'
import { isValidAddress } from './settingsUtils'

export function NudgerSettingsSection() {
  const location = useLocation()
  const navigate = useNavigate()
  const { intensity, setIntensity } = useNudgeIntensity()
  const { mutedTopics, addTopic, removeTopic } = useMutedTopics()
  const { muteNudger, unmuteNudger, isMuted } = useMutedNudgers()
  const [trustedNudgers, setTrustedNudgers] = useState<TrustedNudgerEntry[]>(loadTrustedNudgers)
  const [newNudger, setNewNudger] = useState('')
  const [newNudgerUrl, setNewNudgerUrl] = useState('')
  const [newMutedTopic, setNewMutedTopic] = useState('')
  const [nudgerError, setNudgerError] = useState<string | null>(null)
  const [nudgerSuccess, setNudgerSuccess] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const nudgerAddress = params.get('addNudger')
    if (!nudgerAddress) return
    if (!isValidNudgerAddress(nudgerAddress)) {
      setNudgerError('Invalid nudger address in opt-in link.')
      params.delete('addNudger')
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true })
      return
    }
    const entry: TrustedNudgerEntry = { address: nudgerAddress, serviceUrl: params.get('nudgerServiceUrl') ?? undefined, name: params.get('nudgerName') ?? undefined, description: params.get('nudgerDescription') ?? undefined, sourceType: params.get('nudgerSourceType') ?? undefined, version: params.get('nudgerVersion') ?? undefined }
    const before = loadTrustedNudgers()
    const updated = addTrustedNudger(entry)
    setTrustedNudgers(updated)
    setNudgerSuccess(before.some((nudger) => nudger.address.toLowerCase() === nudgerAddress.toLowerCase()) ? 'This nudger is already enabled.' : entry.name ? `Enabled ${entry.name}.` : 'Enabled nudger suggestions.')
    for (const key of ['addNudger', 'nudgerServiceUrl', 'nudgerName', 'nudgerDescription', 'nudgerSourceType', 'nudgerVersion']) params.delete(key)
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true })
  }, [location.pathname, location.search, navigate])

  const handleAddNudger = async () => {
    setNudgerError(null)
    setNudgerSuccess(null)
    const address = newNudger.trim()
    if (!address) return setNudgerError('Please enter an address')
    if (!isValidAddress(address)) return setNudgerError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.')
    if (trustedNudgers.some((n) => n.address.toLowerCase() === address.toLowerCase())) return setNudgerError('This address is already in your nudger list')
    const serviceUrl = newNudgerUrl.trim() || undefined
    const entry: TrustedNudgerEntry = { address, serviceUrl }
    if (serviceUrl) {
      const meta = await fetch(`${serviceUrl.replace(/\/+$/, '')}/.well-known/nudger.json`).catch(() => null)
      if (meta?.ok) {
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
    const updated = trustedNudgers.filter((n) => n.address !== entry.address)
    setTrustedNudgers(updated)
    saveTrustedNudgers(updated)
    setNudgerSuccess('Removed')
  }

  const addMutedTopic = () => {
    if (newMutedTopic.trim()) {
      addTopic(newMutedTopic)
      setNewMutedTopic('')
    }
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><Typography variant="h6">Nudger addresses</Typography><Chip icon={<AutoFixHighIcon />} label="Nudgers" size="small" variant="outlined" /></Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Nudgers are services that suggest statements you might want to believe based on your current beliefs. Add wallet addresses of nudgers you trust to receive personalized statement suggestions.</Typography>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Suggestion intensity</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Control how prominently nudges appear. Low shows at most 3 suggestions per statement, medium shows up to 5, and high shows up to 10.</Typography>
      <ToggleButtonGroup value={intensity} exclusive onChange={(_, value: NudgeIntensity | null) => { if (value) setIntensity(value) }} sx={{ mb: 3 }}><ToggleButton value="low">Low</ToggleButton><ToggleButton value="medium">Medium</ToggleButton><ToggleButton value="high">High</ToggleButton></ToggleButtonGroup>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Muted topics</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Nudges about these topics will not be shown. Add topics you are not interested in.</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}><TextField fullWidth size="small" label="Topic" placeholder="e.g., crypto, education, healthcare" value={newMutedTopic} onChange={(e) => setNewMutedTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addMutedTopic() }} /><Button variant="contained" startIcon={<AddIcon />} onClick={addMutedTopic} sx={{ whiteSpace: 'nowrap' }}>Add</Button></Box>
      {mutedTopics.length > 0 && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>{mutedTopics.map((topic) => <Chip key={topic} label={topic} onDelete={() => removeTopic(topic)} size="small" />)}</Box>}
      {loadDefaultNudgers().length > 0 && trustedNudgers.length === 0 && <Alert severity="info" sx={{ mb: 3 }}><Typography variant="body2" sx={{ fontWeight: 'medium' }}>Default nudgers from environment:</Typography><Typography variant="body2" component="div" sx={{ mt: 1 }}>{loadDefaultNudgers().map((entry) => <Chip key={entry.address} label={entry.name ?? entry.address} size="small" sx={{ mr: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.75rem' }} />)}</Typography></Alert>}
      {nudgerError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setNudgerError(null)}>{nudgerError}</Alert>}
      {nudgerSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNudgerSuccess(null)}>{nudgerSuccess}</Alert>}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}><TextField fullWidth size="small" label="Wallet Address" placeholder="0x..." value={newNudger} onChange={(e) => setNewNudger(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddNudger() }} /><Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNudger} sx={{ whiteSpace: 'nowrap' }}>Add</Button></Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Optionally provide the nudger service URL to discover its name and description.</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}><TextField fullWidth size="small" label="Service URL (optional)" placeholder="http://localhost:3002" value={newNudgerUrl} onChange={(e) => setNewNudgerUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddNudger() }} /></Box>
      <Divider sx={{ mb: 2 }} />
      {trustedNudgers.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No nudgers configured yet. Add a wallet address above to receive personalized statement suggestions.</Typography> : <List>{trustedNudgers.map((entry) => <ListItem key={entry.address} divider sx={isMuted(entry.address) ? { opacity: 0.5 } : {}}><ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}><Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{entry.address}</Typography>{entry.name && <Chip label={entry.name} size="small" color="primary" variant="outlined" />}{entry.sourceType && <Chip label={entry.sourceType} size="small" variant="outlined" />}{isMuted(entry.address) && <Chip label="Muted" size="small" color="error" variant="outlined" />}</Box>} secondary={entry.description ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{entry.description}</Typography> : null} /><ListItemSecondaryAction><IconButton edge="end" aria-label={isMuted(entry.address) ? 'unmute nudger' : 'mute nudger'} onClick={() => { if (isMuted(entry.address)) unmuteNudger(entry.address); else muteNudger(entry.address) }} size="small" sx={{ mr: 1 }}>{isMuted(entry.address) ? <span style={{ fontSize: '1rem' }}>🔇</span> : <span style={{ fontSize: '1rem' }}>🔊</span>}</IconButton><IconButton edge="end" aria-label="remove" onClick={() => handleRemoveNudger(entry)} size="small"><DeleteIcon /></IconButton></ListItemSecondaryAction></ListItem>)}</List>}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>{trustedNudgers.length} nudger{trustedNudgers.length !== 1 ? 's' : ''} configured</Typography>
      {loadDefaultNudgers().length > 0 && trustedNudgers.length > 0 && <Alert severity="info" sx={{ mt: 2 }}>Also using {loadDefaultNudgers().length} default nudger{loadDefaultNudgers().length !== 1 ? 's' : ''} from environment.</Alert>}
    </Paper>
  )
}
