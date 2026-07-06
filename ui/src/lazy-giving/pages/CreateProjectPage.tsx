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
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import { ProjectFactoryAbi } from '@commonality/sdk/abis'
import { createProject, type ProjectFactoryContract } from '@commonality/sdk/lazy-giving'
import { uploadToIPFS, uploadBlobToIPFS } from '@commonality/sdk/utils'
import { parseUnits } from 'viem'
import { DEFAULT_PAYMENT_CURRENCY, getConfiguredPaymentCurrency } from '../../shared'
import { usePaymentTokenCurrency } from '../../shared'
import { projectPathForAddress } from '../../shared'
import { useWriteClients } from '../../shared'
import { RecipientPicker } from '../components/RecipientPicker'
import { WalletButton } from '../../shared/components/WalletButton'
import { formatCurrencyAmount, formatTokenCapacityPreviewRows, hasOneUnitDonationOption, suggestGivingLevels, summarizeProjectTokenCapacity } from '../projectCreation'

interface TokenTypeRow {
  tokenId: string
  supply: string
  price: string
  name: string
  imageFile: File | null
  imagePreviewUrl: string | null
}

const EMPTY_TOKEN_ROW: TokenTypeRow = { tokenId: '0', supply: '', price: '1', name: '$1 Donation', imageFile: null, imagePreviewUrl: null }

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const writeClients = useWriteClients(address)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [updatesUrl, setUpdatesUrl] = useState('')
  const [recipient, setRecipient] = useState<string | null>(null)
  const [threshold, setThreshold] = useState('')
  const [stopAtGoal, setStopAtGoal] = useState(true)
  const [deadline, setDeadline] = useState('')
  const [tokenTypes, setTokenTypes] = useState<TokenTypeRow[]>([{ ...EMPTY_TOKEN_ROW }])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdProjectAddress, setCreatedProjectAddress] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const paymentTokenAddress = import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS
  const { currency: loadedPaymentCurrency, loading: paymentCurrencyLoading } = usePaymentTokenCurrency(publicClient, paymentTokenAddress)
  const paymentCurrency = loadedPaymentCurrency ?? getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY
  const paymentSymbol = paymentCurrency.symbol
  const tokenCapacitySummary = summarizeProjectTokenCapacity(tokenTypes, paymentCurrency.decimals)
  const tokenCapacityPreviewRows = formatTokenCapacityPreviewRows(tokenTypes, paymentCurrency.decimals, paymentSymbol)
  const hasSmallDonationOption = hasOneUnitDonationOption(tokenTypes, paymentCurrency.decimals)

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

  const addSuggestedGivingLevels = () => {
    setTokenTypes(prev => suggestGivingLevels(prev, threshold, stopAtGoal, paymentCurrency.decimals))
  }

  const removeTokenType = (index: number) => {
    if (tokenTypes.length <= 1) return
    setTokenTypes(prev => prev.filter((_, i) => i !== index))
  }

  // Returns an error message string if the form is invalid, otherwise null.
  const validateForm = (): string | null => {
    if (!name.trim()) return 'Project name is required'
    if (!threshold || parseFloat(threshold) <= 0) return 'Funding goal must be positive'
    if (!deadline) return 'Deadline is required'

    const normalizedUpdatesUrl = updatesUrl.trim()
    if (normalizedUpdatesUrl) {
      try {
        const parsedUrl = new URL(normalizedUpdatesUrl)
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return 'Updates link must be an http(s) URL'
        }
      } catch {
        return 'Updates link must be a valid URL'
      }
    }

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000)
    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      return 'Deadline must be in the future'
    }

    for (const [i, token] of tokenTypes.entries()) {
      if (!token.supply || parseInt(token.supply) <= 0) {
        return `Token type ${i + 1}: supply must be positive`
      }
      if (!token.price || parseFloat(token.price) <= 0) {
        return `Token type ${i + 1}: price must be positive`
      }
    }

    return null
  }

  // Validate first (surfacing errors immediately), then open the confirmation
  // dialog before firing the irreversible on-chain + IPFS creation.
  const handleCreateClick = () => {
    if (!writeClients || !address) return
    if (createdProjectAddress) return // already created — guard against duplicates

    const validationError = validateForm()
    if (validationError) { setError(validationError); return }

    setError(null)
    setConfirmOpen(true)
  }

  const performCreate = async () => {
    if (!writeClients || !address) return
    setConfirmOpen(false)

    const normalizedUpdatesUrl = updatesUrl.trim()
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000)

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
      if (normalizedUpdatesUrl) {
        projectMeta.updatesUrl = normalizedUpdatesUrl
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

      const clients = writeClients!

      const recipientAddress = (recipient || address) as `0x${string}`

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
        <Alert severity="info" sx={{ mb: 2 }}>Connect your wallet to create a project. Once connected, you'll stay on this page to finish setup.</Alert>
        <WalletButton />
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
            Set a dollar funding goal and deadline, then add visible giving options for contributors. Behind the scenes, each giving option still creates a receipt-token type; contributors' payments count toward the goal and are refundable if the goal is not reached.
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
            label="Updates channel link (optional)"
            value={updatesUrl}
            onChange={(e) => setUpdatesUrl(e.target.value)}
            fullWidth
            type="url"
            placeholder="https://example.com/your-project-updates"
            helperText="Link to a channel you already run and moderate, such as a blog, X/Substack/YouTube/GitHub page, or Discord. We'll show it as the project's progress-updates link."
          />

          <RecipientPicker
            address={address}
            onChange={(addr) => setRecipient(addr)}
          />

          <TextField
            label={`Funding goal (${paymentSymbol})`}
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            inputProps={{ min: 0, step: 'any' }}
            helperText="Set the dollar goal contributors are trying to reach. Contributions still use the existing receipt-token contract under the hood."
            sx={{ maxWidth: 360 }}
            required
          />

          <FormControl>
            <FormLabel id="funding-cap-choice-label">After the goal is reached</FormLabel>
            <RadioGroup
              aria-labelledby="funding-cap-choice-label"
              value={stopAtGoal ? 'stop' : 'continue'}
              onChange={(e) => setStopAtGoal(e.target.value === 'stop')}
            >
              <FormControlLabel value="stop" control={<Radio />} label="Stop at goal (fully funded → done)" />
              <FormControlLabel value="continue" control={<Radio />} label="Keep accepting contributions after the goal" />
            </RadioGroup>
          </FormControl>

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
              Giving Options
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Edit the visible contribution options donors can choose from. The default $1 Donation option lets donors give flexible amounts; advanced receipt token IDs stay automatic.
            </Typography>

            <Stack spacing={2}>
              {tokenTypes.map((token, index) => (
                <Box key={index} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
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
                    label="Option name (optional)"
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
                        aria-label={`Giving option ${index + 1} image`}
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
                        alt="Giving option preview"
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                  </Box>
                  {tokenTypes.length > 1 && (
                    <IconButton onClick={() => removeTokenType(index)} size="small" aria-label="Remove giving option">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Button
                startIcon={<AddIcon />}
                onClick={addTokenType}
                size="small"
              >
                Add Giving Option
              </Button>
              <Button
                onClick={addSuggestedGivingLevels}
                size="small"
                variant="outlined"
              >
                Suggest giving levels
              </Button>
            </Stack>

            {!hasSmallDonationOption && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Without a $1 Donation option, donors can only give in the fixed amounts represented by your remaining options.
              </Alert>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" component="div">Donor-eye preview</Typography>
              <Typography variant="body2" component="div">
                Donors will see giving choices like: {tokenTypes.map(token => token.name.trim() || `${token.price || '?'} ${paymentSymbol} option`).join(', ') || '—'}.
              </Typography>
              <Typography variant="body2" component="div">
                {stopAtGoal
                  ? `This project can accept up to ${formatCurrencyAmount(tokenCapacitySummary.totalCapacity, paymentCurrency.decimals, paymentSymbol)} before it is fully funded.`
                  : `The ${threshold || 'configured'} ${paymentSymbol} goal is a target; the current supplies allow more contributions after the goal.`}
              </Typography>
            </Alert>

            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">What gets created</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {tokenCapacityPreviewRows.map((row, index) => (
                    <Typography key={`${tokenTypes[index]?.tokenId ?? index}-${index}`} variant="body2" component="div">
                      {row}
                    </Typography>
                  ))}
                  <Typography variant="body2" component="div">
                    Total possible contributions: {formatCurrencyAmount(tokenCapacitySummary.totalCapacity, paymentCurrency.decimals, paymentSymbol)}
                  </Typography>
                  <Typography variant="body2" component="div">
                    Smallest denomination: {tokenCapacitySummary.smallestPrice === null ? '—' : formatCurrencyAmount(tokenCapacitySummary.smallestPrice, paymentCurrency.decimals, paymentSymbol)}
                  </Typography>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>

          <Button
            variant="contained"
            onClick={handleCreateClick}
            disabled={submitting || paymentCurrencyLoading || createdProjectAddress !== null}
            sx={{ alignSelf: 'flex-start' }}
          >
            {submitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating Project...
              </>
            ) : createdProjectAddress !== null ? 'Project Created' : 'Create Project'}
          </Button>

          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Create this project?</DialogTitle>
            <DialogContent>
              <DialogContentText>
                This creates the project on-chain and uploads its details to IPFS. On-chain
                creation is permanent and can't be undone, so please double-check the name,
                funding goal, deadline, and giving options before continuing. You'll confirm
                the transaction in your wallet next.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOpen(false)}>Go back</Button>
              <Button onClick={performCreate} variant="contained">
                Confirm &amp; create
              </Button>
            </DialogActions>
          </Dialog>

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
