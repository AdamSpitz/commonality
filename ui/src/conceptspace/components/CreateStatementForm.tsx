import { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createAndSignStatement,
  createGraphQLClient,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  type TestClients,
  type StatementContent,
} from '@commonality/sdk'

interface CreateStatementFormProps {
  onStatementCreated?: (statementCid: string) => void
}

export function CreateStatementForm({ onStatementCreated }: CreateStatementFormProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [content, setContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const BELIEFS_CONTRACT_ADDRESS = import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}` | undefined
  const MUTABLE_REF_UPDATER_CONTRACT_ADDRESS = import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}` | undefined
  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isConnected || !address || !walletClient || !publicClient) {
      setError('Please connect your wallet first')
      return
    }

    if (!BELIEFS_CONTRACT_ADDRESS || !MUTABLE_REF_UPDATER_CONTRACT_ADDRESS) {
      setError('Contract addresses not configured')
      return
    }

    if (!content.trim()) {
      setError('Please enter statement content')
      return
    }

    setIsCreating(true)

    try {
      // Create statement data
      const statementData: StatementContent = {
        statementType: 'statement',
        content: content.trim(),
        metadata: {
          createdDate: new Date().toISOString(),
        },
      }

      // Set up contracts
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      }

      const mutableRefContract: MutableRefUpdaterContract = {
        address: MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
        abi: MutableRefUpdaterAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      const graphqlClient = createGraphQLClient(GRAPHQL_URL)

      // Use the new high-level workflow function
      const result = await createAndSignStatement(
        clients,
        {
          beliefs: beliefsContract,
          mutableRefUpdater: mutableRefContract,
        },
        statementData,
        {
          graphqlClient,
          addToCreatedList: true,
          onIPFSUpload: (cid) => {
            console.log('Statement uploaded to IPFS:', cid)
          },
          onSigned: (txHash) => {
            console.log('Statement signed, tx:', txHash)
          },
          onListUpdated: (txHash) => {
            console.log('Created statements list updated, tx:', txHash)
          },
        }
      )

      console.log('Statement creation complete:', result)

      setSuccess('Statement created and signed successfully!')
      setContent('')

      if (onStatementCreated) {
        onStatementCreated(result.cid)
      }
    } catch (err) {
      console.error('Error creating statement:', err)
      setError(err instanceof Error ? err.message : 'Failed to create statement')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isConnected) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Please connect your wallet to create a statement.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Create a Statement
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Statement Content"
          placeholder="Enter your statement here (supports Markdown)..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isCreating}
          sx={{ mb: 2 }}
        />
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
        <Button
          type="submit"
          variant="contained"
          disabled={isCreating || !content.trim()}
          startIcon={isCreating ? <CircularProgress size={20} /> : null}
        >
          {isCreating ? 'Creating...' : 'Create and Sign Statement'}
        </Button>
      </Box>
    </Paper>
  )
}
