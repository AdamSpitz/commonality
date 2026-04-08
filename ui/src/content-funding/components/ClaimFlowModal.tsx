import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  TextField,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material'
import { useAccount } from 'wagmi'
import { useClaimFlow } from '../hooks/useClaimFlow'

interface ClaimFlowModalProps {
  open: boolean
  onClose: () => void
  channelDisplayName: string
  onSuccess?: () => void
}

const steps = ['Connect Wallet', 'Verify Identity', 'Claim Funds']

export function ClaimFlowModal({
  open,
  onClose,
  channelDisplayName,
  onSuccess,
}: ClaimFlowModalProps) {
  const { isConnected } = useAccount()
  const { getChallenge, confirmVerification, loading: apiLoading, error: apiError, clearError } = useClaimFlow()

  const [activeStep, setActiveStep] = useState(0)
  const [challenge, setChallenge] = useState<{ nonce: string; challengeTweetText: string } | null>(null)
  const [tweetUrl, setTweetUrl] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setActiveStep(isConnected ? 1 : 0)
      setChallenge(null)
      setTweetUrl('')
      setConfirmError(null)
      setTransactionHash(null)
      clearError()
    }
  }, [open, isConnected, clearError])

  const handleGetChallenge = async () => {
    const result = await getChallenge('twitter')
    if (result) {
      setChallenge(result)
    }
  }

  const handleConfirmVerification = async () => {
    if (!challenge) return

    setConfirmLoading(true)
    setConfirmError(null)

    try {
      const verificationResult = await confirmVerification(challenge.nonce)

      if (!verificationResult) {
        setConfirmError('Verification failed. Please make sure you have tweeted the challenge.')
        return
      }

      if (verificationResult.success && verificationResult.transactionHash) {
        setTransactionHash(verificationResult.transactionHash)
        setActiveStep(2)
        onSuccess?.()
      } else {
        setConfirmError('Verification was successful but the transaction was not submitted. Please try again.')
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setChallenge(null)
    setTweetUrl('')
    setConfirmError(null)
    setTransactionHash(null)
    onClose()
  }

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" gutterBottom>
              Connect your wallet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              To verify your identity and claim these funds, you'll need to connect your Ethereum wallet.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you don&apos;t have a wallet, you can create one using ConnectKit.
            </Typography>
          </Box>
        )

      case 1:
        return (
          <Box>
            {!challenge ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Verify your identity
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Verify that you own the &quot;{channelDisplayName}&quot; account by posting a verification tweet.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGetChallenge}
                  disabled={apiLoading}
                >
                  {apiLoading ? <CircularProgress size={24} /> : 'Get Verification Tweet'}
                </Button>
                {apiError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {apiError.message}
                  </Alert>
                )}
              </Box>
            ) : (
              <Stack spacing={2}>
                <Alert severity="info">
                  Tweet the following to verify your identity:
                </Alert>
                <TextField
                  label="Tweet text"
                  value={challenge.challengeTweetText}
                  multiline
                  rows={3}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <Button
                  variant="outlined"
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(challenge.challengeTweetText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open X to Tweet
                </Button>
                <TextField
                  label="Paste your tweet URL here after posting"
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://x.com/username/status/..."
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleConfirmVerification}
                  disabled={!tweetUrl || confirmLoading}
                >
                  {confirmLoading ? <CircularProgress size={24} /> : 'I Tweeted It'}
                </Button>
                {confirmError && (
                  <Alert severity="error">
                    {confirmError}
                  </Alert>
                )}
              </Stack>
            )}
          </Box>
        )

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" gutterBottom color="success.main">
              Channel Verified!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You have successfully verified your identity for &quot;{channelDisplayName}&quot;.
            </Typography>
            {transactionHash && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Transaction: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
              </Typography>
            )}
            <Typography color="text.secondary">
              You can now withdraw the escrowed funds from your dashboard.
            </Typography>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Claim Funds for {channelDisplayName}
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {getStepContent()}
      </DialogContent>
      <DialogActions>
        {activeStep < 2 ? (
          <Button onClick={handleClose}>Cancel</Button>
        ) : (
          <Button onClick={handleClose}>Done</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}