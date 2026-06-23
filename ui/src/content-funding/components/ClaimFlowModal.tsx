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
import { formatEther } from 'viem'
import { useClaimFlow } from '../hooks/useClaimFlow'
import { ChannelEscrowAbi, ChannelRegistryAbi, withdrawFromEscrow, takeChannelControl, hashCanonicalId } from '@commonality/sdk'
import type { ChannelState } from '@commonality/sdk'
import { useWriteClients } from '../../shared'

interface ClaimFlowModalProps {
  open: boolean
  onClose: () => void
  channelDisplayName: string
  channelId: string
  platform: string
  handle: string
  claimantAddress: string
  escrowBalance: bigint
  channelState: ChannelState
  onSuccess?: () => void
}

const steps = ['Connect Wallet', 'Verify Identity', 'Withdraw Funds', 'Take Control']

export function ClaimFlowModal({
  open,
  onClose,
  channelDisplayName,
  channelId,
  platform,
  handle,
  claimantAddress,
  escrowBalance,
  channelState,
  onSuccess,
}: ClaimFlowModalProps) {
  const { isConnected } = useAccount()
  const writeClients = useWriteClients(claimantAddress)
  const { getChallenge, confirmVerification, loading: apiLoading, error: apiError, clearError } = useClaimFlow()

  const [activeStep, setActiveStep] = useState(0)
  const [challenge, setChallenge] = useState<{ nonce: string; verificationPostTemplate: string; channelId: string; handle?: string; displayName?: string } | null>(null)
  const [tweetUrl, setTweetUrl] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null)
  const [takingControl, setTakingControl] = useState(false)
  const [takeControlError, setTakeControlError] = useState<string | null>(null)
  const [takeControlTxHash, setTakeControlTxHash] = useState<string | null>(null)

  const isVerified = channelState === 'verified'
  const isCreatorControlled = channelState === 'creator-controlled'
  const showWithdrawStep = isVerified || isCreatorControlled
  const showTakeControlStep = isVerified

  useEffect(() => {
    if (open) {
      let step = isConnected ? 1 : 0
      if (channelState === 'unclaimed' && isConnected) {
        step = 1
      }
      setActiveStep(step)
      setChallenge(null)
      setTweetUrl('')
      setConfirmError(null)
      setTransactionHash(null)
      setWithdrawError(null)
      setWithdrawTxHash(null)
      setTakeControlError(null)
      setTakeControlTxHash(null)
      clearError()
    }
  }, [open, isConnected, clearError, channelState])

  const handleGetChallenge = async () => {
    const result = await getChallenge(platform, handle, claimantAddress)
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
        const platformMessage = platform === 'twitter'
          ? 'Verification failed. Please make sure you have tweeted the challenge.'
          : platform === 'youtube'
            ? 'Verification failed. Please make sure the challenge text is in your video description.'
            : 'Verification failed. Please make sure you have published the post and the RSS feed has updated.'
        setConfirmError(platformMessage)
        return
      }

      if (verificationResult.txHash) {
        setTransactionHash(verificationResult.txHash)
        const nextStep = showWithdrawStep ? 2 : 3
        setActiveStep(nextStep)
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

  const handleWithdraw = async () => {
    if (!writeClients || !channelId) return

    const escrowAddress = import.meta.env.VITE_CHANNEL_ESCROW_ADDRESS
    if (!escrowAddress) {
      setWithdrawError('Channel escrow not configured')
      return
    }

    try {
      setWithdrawing(true)
      setWithdrawError(null)

      const clients = writeClients!

      const escrowContract = {
        address: escrowAddress as `0x${string}`,
        abi: ChannelEscrowAbi,
      }

      const result = await withdrawFromEscrow(clients, escrowContract, hashCanonicalId(channelId))
      setWithdrawTxHash(result.hash)
      setActiveStep(showTakeControlStep ? 3 : 4)
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Failed to withdraw')
    } finally {
      setWithdrawing(false)
    }
  }

  const handleTakeControl = async () => {
    if (!writeClients || !channelId) return

    const registryAddress = import.meta.env.VITE_CHANNEL_REGISTRY_ADDRESS
    if (!registryAddress) {
      setTakeControlError('Channel registry not configured')
      return
    }

    try {
      setTakingControl(true)
      setTakeControlError(null)

      const clients = writeClients!

      const registryContract = {
        address: registryAddress as `0x${string}`,
        abi: ChannelRegistryAbi,
      }

      const result = await takeChannelControl(clients, registryContract, hashCanonicalId(channelId))
      setTakeControlTxHash(result.hash)
      setActiveStep(4)
    } catch (err) {
      setTakeControlError(err instanceof Error ? err.message : 'Failed to take control')
    } finally {
      setTakingControl(false)
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
                  startIcon={apiLoading ? <CircularProgress size={20} /> : undefined}
                >
                  Get Verification Tweet
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
                  {platform === 'twitter'
                    ? 'Tweet the following to verify your identity:'
                    : platform === 'youtube'
                      ? 'Add the following to your video description to verify your identity:'
                      : 'Publish the following post on your Substack to verify your identity:'}
                </Alert>
                <TextField
                  label={platform === 'twitter' ? 'Tweet text' : platform === 'youtube' ? 'Video description text' : 'Post content'}
                  value={challenge.verificationPostTemplate}
                  multiline
                  rows={3}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                {platform === 'twitter' ? (
                  <Button
                    variant="outlined"
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(challenge.verificationPostTemplate)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open X to Tweet
                  </Button>
                ) : platform === 'youtube' ? (
                  <Button
                    variant="outlined"
                    href={`https://www.youtube.com/channel/${handle?.replace('@', '')}/videos`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open YouTube Studio
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    href={`https://${handle}.substack.com/publish`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Substack Editor
                  </Button>
                )}
                {platform === 'twitter' ? (
                  <TextField
                    label="Paste your tweet URL here after posting"
                    value={tweetUrl}
                    onChange={(e) => setTweetUrl(e.target.value)}
                    placeholder="https://x.com/username/status/..."
                    fullWidth
                  />
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    {platform === 'youtube'
                      ? 'After adding the text above to your video description, click the button below. The system will search for your video with the challenge code.'
                      : 'After publishing the post, click the button below. The system will search the RSS feed for the challenge code. Note that the RSS feed may take several minutes to update.'}
                  </Typography>
                )}
                <Button
                  variant="contained"
                  onClick={handleConfirmVerification}
                  disabled={platform === 'twitter' ? (!tweetUrl || confirmLoading) : confirmLoading}
                >
                  {confirmLoading ? <CircularProgress size={24} /> : platform === 'twitter' ? 'I Tweeted It' : platform === 'youtube' ? 'I Added It' : 'I Published It'}
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
            {showWithdrawStep ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Withdraw Funds
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  You have successfully verified your identity for &quot;{channelDisplayName}&quot;.
                </Typography>
                {transactionHash && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Verification: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                  </Typography>
                )}
                <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
                  {formatEther(escrowBalance)} ETH
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  size="large"
                  onClick={handleWithdraw}
                  disabled={withdrawing || escrowBalance === 0n}
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw to Wallet'}
                </Button>
                {withdrawError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {withdrawError}
                  </Alert>
                )}
                {withdrawTxHash && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Transaction: {withdrawTxHash.slice(0, 10)}...{withdrawTxHash.slice(-8)}
                  </Typography>
                )}
                {!showTakeControlStep && (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    You can now manage future contracts from your dashboard.
                  </Typography>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </Box>
        )

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {showTakeControlStep ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Take Control
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Take control to manage future funding contracts for your content. Only you will be able to create new rounds.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleTakeControl}
                  disabled={takingControl}
                >
                  {takingControl ? 'Taking Control...' : 'Take Control'}
                </Button>
                {takeControlError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {takeControlError}
                  </Alert>
                )}
                {takeControlTxHash && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Transaction: {takeControlTxHash.slice(0, 10)}...{takeControlTxHash.slice(-8)}
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Typography variant="h6" gutterBottom color="success.main">
                  All Done!
                </Typography>
                <Typography color="text.secondary">
                  You can now manage your channels from the dashboard.
                </Typography>
              </>
            )}
          </Box>
        )

      case 4:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" gutterBottom color="success.main">
              All Done!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You now have full control over your content funding.
            </Typography>
            {takeControlTxHash && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Transaction: {takeControlTxHash.slice(0, 10)}...{takeControlTxHash.slice(-8)}
              </Typography>
            )}
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
        {activeStep < 2 || activeStep === 2 && !showWithdrawStep ? (
          <Button onClick={handleClose}>Cancel</Button>
        ) : (
          <Button onClick={handleClose}>Done</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
