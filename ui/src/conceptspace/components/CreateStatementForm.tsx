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
  uploadToIPFS,
  believeStatement,
  updateRef,
  getUserRef,
  createGraphQLClient,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  type TestClients,
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
      // Create statement JSON and upload to IPFS
      const statement = {
        statementType: 'statement',
        content: content.trim(),
        metadata: {
          createdDate: new Date().toISOString(),
        },
      }

      console.log('Uploading statement to IPFS:', statement)
      const statementCid = await uploadToIPFS(statement)
      console.log('Statement uploaded with CID:', statementCid)

      // Sign the statement
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      }

      // Create a minimal TestClients-compatible object
      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      console.log('Signing statement...')
      const txHash = await believeStatement(clients, beliefsContract, statementCid)
      console.log('Statement signed, tx:', txHash)

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log('Transaction confirmed in block:', receipt.blockNumber)

      // Update the user's created statements list
      const mutableRefContract: MutableRefUpdaterContract = {
        address: MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
        abi: MutableRefUpdaterAbi,
      }

      console.log('Updating created statements list...')
      const graphqlClient = createGraphQLClient(GRAPHQL_URL)
      const existingRef = await getUserRef(graphqlClient, address, 'created-statements')

      let newStatementList: string[]
      if (existingRef?.value) {
        // Try to parse existing list, or treat as single CID
        try {
          const existingData = JSON.parse(existingRef.value)
          newStatementList = Array.isArray(existingData.statements)
            ? [...existingData.statements, statementCid]
            : [existingRef.value, statementCid]
        } catch {
          // If not valid JSON, treat as single CID
          newStatementList = [existingRef.value, statementCid]
        }
      } else {
        newStatementList = [statementCid]
      }

      const listData = {
        statements: newStatementList,
        version: 1,
      }
      const listCid = await uploadToIPFS(listData)

      await updateRef(clients, mutableRefContract, 'created-statements', listCid)
      console.log('Created statements list updated')

      setSuccess('Statement created and signed successfully!')
      setContent('')

      if (onStatementCreated) {
        onStatementCreated(statementCid)
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
