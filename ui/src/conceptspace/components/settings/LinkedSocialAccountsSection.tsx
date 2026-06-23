import { useEffect, useState } from 'react'
import { getUserSocialData } from '@commonality/sdk'
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material'
import { useAccount } from 'wagmi'
import { useClaimFlow } from '../../../content-funding'
import { useMachinery } from '../../../shared/hooks/useMachinery'
import { loadTwitterHandleHint, saveTwitterHandleHint } from '../../twitterHandleHints'

export function LinkedSocialAccountsSection() {
  const { address, isConnected } = useAccount()
  const machinery = useMachinery()
  const { getChallenge, confirmVerification, loading: verificationLoading, error: verificationError, clearError } = useClaimFlow()
  const [twitterHandle, setTwitterHandle] = useState('')
  const [twitterAssociationStatus, setTwitterAssociationStatus] = useState<string | null>(null)
  const [twitterAssociationError, setTwitterAssociationError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<{ nonce: string; verificationPostTemplate: string } | null>(null)
  const [confirmingTwitterLink, setConfirmingTwitterLink] = useState(false)

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
    getUserSocialData(machinery, address, { twitterHandleHint: savedHandle }).then((data) => {
      if (!cancelled) setTwitterAssociationStatus(data?.isTwitterVerified ? `Linked via channel registry as ${data.twitterHandle ?? savedHandle}` : null)
    }).catch(() => { if (!cancelled) setTwitterAssociationStatus(null) })
    return () => { cancelled = true }
  }, [address, machinery])

  const handleGetTwitterChallenge = async () => {
    if (!address) return
    setTwitterAssociationError(null)
    clearError()
    const normalizedHandle = twitterHandle.trim()
    if (!normalizedHandle) return setTwitterAssociationError('Please enter your Twitter / X handle first.')
    const result = await getChallenge('twitter', normalizedHandle, address)
    if (result) setChallenge({ nonce: result.nonce, verificationPostTemplate: result.verificationPostTemplate })
  }

  const handleConfirmTwitterLink = async () => {
    if (!challenge || !address) return
    setConfirmingTwitterLink(true)
    setTwitterAssociationError(null)
    try {
      const result = await confirmVerification(challenge.nonce)
      if (!result) return setTwitterAssociationError('Verification failed. Please make sure you posted the verification tweet.')
      saveTwitterHandleHint(address, twitterHandle)
      const socialData = await getUserSocialData(machinery, address, { twitterHandleHint: twitterHandle.trim() })
      setTwitterAssociationStatus(socialData?.isTwitterVerified ? `Linked via channel registry as ${socialData.twitterHandle ?? twitterHandle.trim()}` : 'Verification succeeded, but the linked account has not shown up in local event data yet.')
      setChallenge(null)
    } catch (err) {
      setTwitterAssociationError(err instanceof Error ? err.message : 'Failed to confirm Twitter verification')
    } finally {
      setConfirmingTwitterLink(false)
    }
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Linked social accounts</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Link your Twitter / X account to your wallet using the same verification flow the content-funding claim page already uses.</Typography>
      {!isConnected || !address ? <Alert severity="info">Connect your wallet to link your Twitter / X account.</Alert> : <>
        {twitterAssociationStatus && <Alert severity="success" sx={{ mb: 2 }}>{twitterAssociationStatus}</Alert>}
        {(twitterAssociationError || verificationError) && <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setTwitterAssociationError(null); clearError() }}>{twitterAssociationError ?? verificationError?.message}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
          <TextField fullWidth size="small" label="Twitter / X handle" placeholder="@alice" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value)} />
          <Button variant="contained" onClick={handleGetTwitterChallenge} disabled={verificationLoading || confirmingTwitterLink} sx={{ whiteSpace: 'nowrap' }}>{verificationLoading ? <CircularProgress size={24} /> : 'Get verification tweet'}</Button>
        </Box>
        {challenge && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Tweet text" value={challenge.verificationPostTemplate} multiline rows={3} fullWidth InputProps={{ readOnly: true }} />
          <Button variant="outlined" href={`https://x.com/intent/tweet?text=${encodeURIComponent(challenge.verificationPostTemplate)}`} target="_blank" rel="noopener noreferrer">Open X to Tweet</Button>
          <Button variant="contained" onClick={handleConfirmTwitterLink} disabled={verificationLoading || confirmingTwitterLink}>{confirmingTwitterLink ? <CircularProgress size={24} /> : 'I tweeted it'}</Button>
        </Box>}
      </>}
    </Paper>
  )
}
