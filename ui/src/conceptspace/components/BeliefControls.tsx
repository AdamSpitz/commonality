import { useState } from 'react'
import {
  Box,
  Button,
  ButtonGroup,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  ThumbUp,
  ThumbDown,
  Clear as ClearIcon,
} from '@mui/icons-material'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  believeStatement,
  disbelieveStatement,
  clearOpinion,
  NO_OPINION,
  BELIEVES,
  DISBELIEVES,
  BeliefsAbi,
  type BeliefsContract,
  type TestClients,
} from '@commonality/sdk'

interface BeliefControlsProps {
  statementCid: string
  currentBeliefState: number // 0=noOpinion, 1=believes, 2=disbelieves
  onBeliefChanged?: () => void
}

export function BeliefControls({
  statementCid,
  currentBeliefState,
  onBeliefChanged,
}: BeliefControlsProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const BELIEFS_CONTRACT_ADDRESS = import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}` | undefined

  const handleBeliefAction = async (action: 'believe' | 'disbelieve' | 'clear') => {
    setError(null)
    setSuccess(null)

    if (!isConnected || !address || !walletClient || !publicClient) {
      setError('Please connect your wallet first')
      return
    }

    if (!BELIEFS_CONTRACT_ADDRESS) {
      setError('Beliefs contract address not configured')
      return
    }

    setIsProcessing(true)

    try {
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      let txHash: `0x${string}`
      let actionText: string

      switch (action) {
        case 'believe':
          txHash = await believeStatement(clients, beliefsContract, statementCid)
          actionText = 'Belief recorded'
          break
        case 'disbelieve':
          txHash = await disbelieveStatement(clients, beliefsContract, statementCid)
          actionText = 'Disbelief recorded'
          break
        case 'clear':
          txHash = await clearOpinion(clients, beliefsContract, statementCid)
          actionText = 'Opinion cleared'
          break
      }

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      setSuccess(`${actionText} successfully!`)

      if (onBeliefChanged) {
        onBeliefChanged()
      }
    } catch (err) {
      console.error('Error updating belief:', err)
      setError(err instanceof Error ? err.message : 'Failed to update belief')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isConnected) {
    return (
      <Alert severity="info">
        Connect your wallet to express your belief about this statement.
      </Alert>
    )
  }

  return (
    <Box>
      <ButtonGroup variant="contained" disabled={isProcessing} sx={{ mb: 2 }}>
        <Button
          onClick={() => handleBeliefAction('believe')}
          color={currentBeliefState === BELIEVES ? 'success' : 'primary'}
          startIcon={isProcessing ? <CircularProgress size={16} /> : <ThumbUp />}
          disabled={isProcessing}
        >
          Believe
        </Button>
        <Button
          onClick={() => handleBeliefAction('disbelieve')}
          color={currentBeliefState === DISBELIEVES ? 'error' : 'primary'}
          startIcon={isProcessing ? <CircularProgress size={16} /> : <ThumbDown />}
          disabled={isProcessing}
        >
          Disbelieve
        </Button>
        {currentBeliefState !== NO_OPINION && (
          <Button
            onClick={() => handleBeliefAction('clear')}
            color="secondary"
            startIcon={isProcessing ? <CircularProgress size={16} /> : <ClearIcon />}
            disabled={isProcessing}
          >
            Clear Opinion
          </Button>
        )}
      </ButtonGroup>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {currentBeliefState === BELIEVES && (
        <Alert severity="success" sx={{ mb: 2 }}>
          You believe this statement is true.
        </Alert>
      )}
      {currentBeliefState === DISBELIEVES && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You believe this statement is false.
        </Alert>
      )}
      {currentBeliefState === NO_OPINION && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have not expressed an opinion on this statement.
        </Alert>
      )}
    </Box>
  )
}
