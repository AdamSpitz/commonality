import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createProject,
  uploadToIPFS,
  uploadBlobToIPFS,
  ProjectFactoryAbi,
  type ProjectFactoryContract,
  type WriteClients,
} from '@commonality/sdk'
import { parseUnits } from 'viem'
import { DEFAULT_PAYMENT_CURRENCY, getConfiguredPaymentCurrency } from '../../shared/currency'
import { usePaymentTokenCurrency } from '../../shared/usePaymentTokenCurrency'
import { projectPathForAddress } from '../../shared/chainAddressRoutes'

interface TokenTypeRow {
  tokenId: string
  supply: string
  price: string
  name: string
  imageFile: File | null
  imagePreviewUrl: string | null
}

const EMPTY_TOKEN_ROW: TokenTypeRow = { tokenId: '0', supply: '', price: '', name: '', imageFile: null, imagePreviewUrl: null }

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [recipient, setRecipient] = useState('')
  const [threshold, setThreshold] = useState('')
  const [deadline, setDeadline] = useState('')
  const [tokenTypes, setTokenTypes] = useState<TokenTypeRow[]>([{ ...EMPTY_TOKEN_ROW }])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdProjectAddress, setCreatedProjectAddress] = useState<string | null>(null)
  const paymentTokenAddress = import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS
  const { currency: loadedPaymentCurrency, loading: paymentCurrencyLoading } = usePaymentTokenCurrency(publicClient, paymentTokenAddress)
  const paymentCurrency = loadedPaymentCurrency ?? getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY
  const paymentSymbol = paymentCurrency.symbol

  const parsePaymentAmount = (value: string) => {
    return parseUnits(value, paymentCurrency.decimals)
  }

  const handleTokenTypeChange = (index: number, field: keyof TokenTypeRow, value: string) => {
    setTokenTypes(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const addTokenType = () => {
    const nextId = Math.max(...tokenTypes.map(t => parseInt(t.tokenId) || 0)) + 1
    setTokenTypes(prev => [...prev, { tokenId: String(nextId), supply: '', price: '', name: '', imageFile: null, imagePreviewUrl: null }])
  }

  const removeTokenType = (index: number) => {
    if (tokenTypes.length <= 1) return
    setTokenTypes(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!walletClient || !publicClient || !address) return

    // Validation
    if (!name.trim()) { setError('Project name is required'); return }
    if (!threshold || parseFloat(threshold) <= 0) { setError('Funding goal must be positive'); return }
    if (!deadline) { setError('Deadline is required'); return }

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000)
    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      setError('Deadline must be in the future')
      return
    }

    for (const [i, token] of tokenTypes.entries()) {
      if (!token.supply || parseInt(token.supply) <= 0) {
        setError(`Token type ${i + 1}: supply must be positive`)
        return
      }
      if (!token.price || parseFloat(token.price) <= 0) {
        setError(`Token type ${i + 1}: price must be positive`)
        return
      }
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      // Upload metadata to IPFS
      const ipfsConfig = {
        apiUrl: import.meta.env.VITE_IPFS_API,
        gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY,
      }

      // Upload per-token metadata (images) if provided
      const tokenMetadataCids: Record<string, string> = {}
      for (const token of tokenTypes) {
        if (!token.imageFile && !token.name) continue
        const tokenMeta: Record<string, string> = {
          name: token.name.trim() || `Token #${token.tokenId}`,
        }
        if (token.imageFile) {
          const imageCid = await uploadBlobToIPFS(ipfsConfig, token.imageFile)
          tokenMeta.image = `ipfs://${imageCid}`
        }
        const tokenMetaCid = await uploadToIPFS(ipfsConfig, tokenMeta)
        tokenMetadataCids[token.tokenId] = tokenMetaCid
      }

      const projectMeta: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
      }
      if (Object.keys(tokenMetadataCids).length > 0) {
        projectMeta.tokens = tokenMetadataCids
      }

      const metadataCid = await uploadToIPFS(ipfsConfig, projectMeta)

      const projectFactoryAddress = import.meta.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS
      if (!projectFactoryAddress) {
        throw new Error('ProjectFactory contract address not configured (VITE_PROJECT_FACTORY_CONTRACT_ADDRESS)')
      }
      if (!paymentTokenAddress) {
        throw new Error('Payment token address not configured (VITE_PAYMENT_TOKEN_ADDRESS)')
      }

      const projectFactoryContract: ProjectFactoryContract = {
        address: projectFactoryAddress as `0x${string}`,
        abi: ProjectFactoryAbi,
      }

      const clients: WriteClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      const recipientAddress = (recipient.trim() || address) as `0x${string}`

      const { projectDetails } = await createProject(clients, projectFactoryContract, {
        metadataURI: `ipfs://${metadataCid}/`,
        contractURI: `ipfs://${metadataCid}/`,
        owner: address,
        recipient: recipientAddress,
        paymentToken: paymentTokenAddress as `0x${string}`,
        threshold: parsePaymentAmount(threshold),
        deadline: BigInt(deadlineTimestamp),
        projectMetadataCid: metadataCid,
        tokenIds: tokenTypes.map(t => BigInt(t.tokenId)),
        tokenCounts: tokenTypes.map(t => BigInt(t.supply)),
        tokenPrices: tokenTypes.map(t => parsePaymentAmount(t.price)),
      })

      setSuccess('Project created successfully!')
      setCreatedProjectAddress(projectDetails.assuranceContractAddress)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Project
        </Typography>
        <Alert severity="info">Connect your wallet to create a project. Use the “Sign in / Wallet” button in the header, then return here to finish setup.</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create Project
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <Alert severity="info">
            Token types are pledge options for backers. Set a funding goal and deadline, then add at least one token type with a supply and price. Backers choose quantities; their payments count toward the goal and are refundable if the goal is not reached.
          </Alert>
          <TextField
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />

          <TextField
            label="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            fullWidth
            placeholder={address}
            helperText="Defaults to your connected wallet if left blank"
          />

          <TextField
            label={`Funding Goal (${paymentSymbol})`}
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            inputProps={{ min: 0, step: 'any' }}
            sx={{ maxWidth: 300 }}
            required
          />

          <TextField
            label="Deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ maxWidth: 300 }}
            required
          />

          {/* Token Types */}
          <Box>
            <Typography variant="h6" component="h2" gutterBottom>
              Token Types
            </Typography>

            <Stack spacing={2}>
              {tokenTypes.map((token, index) => (
                <Box key={index} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    size="small"
                    label="Token ID"
                    value={token.tokenId}
                    onChange={(e) => handleTokenTypeChange(index, 'tokenId', e.target.value)}
                    inputProps={{ min: 0 }}
                    sx={{ width: 120 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Supply"
                    value={token.supply}
                    onChange={(e) => handleTokenTypeChange(index, 'supply', e.target.value)}
                    inputProps={{ min: 1 }}
                    sx={{ width: 140 }}
                    required
                  />
                  <TextField
                    type="number"
                    size="small"
                    label={`Price (${paymentSymbol})`}
                    value={token.price}
                    onChange={(e) => handleTokenTypeChange(index, 'price', e.target.value)}
                    inputProps={{ min: 0, step: 'any' }}
                    sx={{ width: 160 }}
                    required
                  />
                  <TextField
                    size="small"
                    label="Token Name (optional)"
                    value={token.name}
                    onChange={(e) => handleTokenTypeChange(index, 'name', e.target.value)}
                    sx={{ width: 200 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      component="label"
                      size="small"
                      variant="outlined"
                    >
                      {token.imageFile ? token.imageFile.name : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        aria-label={`Token ${index + 1} image`}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          const previewUrl = file ? URL.createObjectURL(file) : null
                          setTokenTypes(prev => prev.map((row, i) => i === index ? { ...row, imageFile: file, imagePreviewUrl: previewUrl } : row))
                        }}
                      />
                    </Button>
                    {token.imagePreviewUrl && (
                      <Box
                        component="img"
                        src={token.imagePreviewUrl}
                        alt="Token preview"
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                  </Box>
                  {tokenTypes.length > 1 && (
                    <IconButton onClick={() => removeTokenType(index)} size="small" aria-label="Remove token type">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>

            <Button
              startIcon={<AddIcon />}
              onClick={addTokenType}
              size="small"
              sx={{ mt: 1 }}
            >
              Add Token Type
            </Button>
          </Box>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || paymentCurrencyLoading}
            sx={{ alignSelf: 'flex-start' }}
          >
            {submitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating Project...
              </>
            ) : 'Create Project'}
          </Button>

          {error && <Alert severity="error">{error}</Alert>}
          {success && (
            <Alert severity="success">
              {success}
              {createdProjectAddress && (
                <Button
                  size="small"
                  onClick={() => navigate(projectPathForAddress(createdProjectAddress))}
                  sx={{ ml: 1 }}
                >
                  View Project
                </Button>
              )}
            </Alert>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
