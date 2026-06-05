import { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Switch,
} from '@mui/material'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createAndSignStatement,
  createStatement,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  type TestClients,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'

interface CreateStatementFormProps {
  onStatementCreated?: (statementCid: IpfsCidV1) => void
}

function parseBulkStatements(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function CreateStatementForm({ onStatementCreated }: CreateStatementFormProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [content, setContent] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkContent, setBulkContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdCount, setCreatedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const BELIEFS_CONTRACT_ADDRESS = import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}` | undefined
  const MUTABLE_REF_UPDATER_CONTRACT_ADDRESS = import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}` | undefined
  const machinery = useMachinery()

  const createAndSignOne = async (statementContent: string) => {
    // Create statement as a DisplayableDocument
    const statementData = createStatement({
      content: statementContent,
    })

    // Set up contracts
    const beliefsContract: BeliefsContract = {
      address: BELIEFS_CONTRACT_ADDRESS!,
      abi: BeliefsAbi,
    }

    const mutableRefContract: MutableRefUpdaterContract = {
      address: MUTABLE_REF_UPDATER_CONTRACT_ADDRESS!,
      abi: MutableRefUpdaterAbi,
    }

    const clients: TestClients = {
      walletClient: walletClient as any,
      publicClient: publicClient as any,
      account: address!,
    }

    return createAndSignStatement(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefContract,
      },
      statementData,
      {
        machinery,
        addToCreatedList: true,
        onIPFSUpload: (_cid) => {},
        onSigned: (_txHash) => {},
        onListUpdated: (_txHash) => {},
      }
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setBulkContent((current) => [current.trim(), text.trim()].filter(Boolean).join('\n'))
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setCreatedCount(0)
    setTotalCount(0)

    if (!isConnected || !address || !walletClient || !publicClient) {
      setError('Please connect your wallet first')
      return
    }

    if (!BELIEFS_CONTRACT_ADDRESS || !MUTABLE_REF_UPDATER_CONTRACT_ADDRESS) {
      setError('Contract addresses not configured')
      return
    }

    const statementsToCreate = bulkMode ? parseBulkStatements(bulkContent) : [content.trim()].filter(Boolean)

    if (statementsToCreate.length === 0) {
      setError(bulkMode ? 'Please enter at least one statement to upload' : 'Please enter statement content')
      return
    }

    setIsCreating(true)
    setTotalCount(statementsToCreate.length)

    try {
      let lastCid: IpfsCidV1 | null = null
      let completedCount = 0

      try {
        for (const statementContent of statementsToCreate) {
          const result = await createAndSignOne(statementContent)
          lastCid = result.cid
          completedCount += 1
          setCreatedCount(completedCount)
        }
      } catch (err) {
        const prefix = bulkMode && completedCount > 0 ? `Created ${completedCount} of ${statementsToCreate.length} statements before failing: ` : ''
        throw new Error(prefix + (err instanceof Error ? err.message : 'Failed to create statement'))
      }

      setSuccess(
        statementsToCreate.length === 1
          ? 'Statement created and signed successfully!'
          : `${statementsToCreate.length} statements created and signed successfully!`,
      )
      setContent('')
      setBulkContent('')

      if (onStatementCreated && lastCid && statementsToCreate.length === 1) {
        onStatementCreated(lastCid)
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
      <FormControlLabel
        control={(
          <Switch
            checked={bulkMode}
            onChange={(e) => setBulkMode(e.target.checked)}
            disabled={isCreating}
          />
        )}
        label="Bulk upload"
        sx={{ mb: 1 }}
      />
      <Box component="form" onSubmit={handleSubmit}>
        {bulkMode ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Paste statements below or upload a .txt file. Each non-empty line will be created and signed as a separate statement.
            </Typography>
            <Button component="label" variant="outlined" disabled={isCreating} sx={{ mb: 2 }}>
              Upload statements file
              <input type="file" accept=".txt,text/plain" hidden onChange={handleFileUpload} />
            </Button>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Statements to Upload"
              placeholder={'One statement per line\nAnother statement\nA third statement'}
              value={bulkContent}
              onChange={(e) => setBulkContent(e.target.value)}
              disabled={isCreating}
              sx={{ mb: 2 }}
            />
          </>
        ) : (
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
        )}
        {isCreating && totalCount > 1 && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="determinate" value={(createdCount / totalCount) * 100} />
            <Typography variant="caption" color="text.secondary">
              Created {createdCount} of {totalCount} statements. Your wallet may ask you to approve each one.
            </Typography>
          </Box>
        )}
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
          disabled={isCreating || (bulkMode ? parseBulkStatements(bulkContent).length === 0 : !content.trim())}
          startIcon={isCreating ? <CircularProgress size={20} /> : null}
        >
          {isCreating ? 'Creating...' : bulkMode ? 'Create and Sign Statements' : 'Create and Sign Statement'}
        </Button>
      </Box>
    </Paper>
  )
}
