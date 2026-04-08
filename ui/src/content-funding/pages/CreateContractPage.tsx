import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import {
  parseCanonicalChannelId,
  hashCanonicalId,
  getChannelOverview,
  parseContentFundingUrl,
  buildCanonicalContentId,
  type ParsedContentFundingUrl,
} from '@commonality/sdk'
import { CreatorAssuranceContractFactoryAbi, createContentFundingContract, getThirdPartyMinPurchase } from '@commonality/sdk'
import { useContentFundingState } from '../hooks/useContentFundingState'
import { usePlatformApi } from '../hooks/usePlatformApi'

interface ContentItemRow {
  id: string
  url: string
  supply: string
  price: string
  parsed: ParsedContentFundingUrl | null
  resolved: { channelId: string; canonicalId: string; metadata: Record<string, unknown> } | null
  validating: boolean
  error: string | null
}

const EMPTY_CONTENT_ITEM: ContentItemRow = {
  id: Math.random().toString(36).slice(2),
  url: '',
  supply: '100',
  price: '0.01',
  parsed: null,
  resolved: null,
  validating: false,
  error: null,
}

function getContentPreviewUrl(url: string): string | null {
  try {
    const parsed = parseContentFundingUrl(url)
    switch (parsed.platform) {
      case 'twitter':
        return `https://x.com/i/web/status/${parsed.tweetId}`
      case 'youtube':
        return `https://www.youtube.com/watch?v=${parsed.videoId}`
      case 'substack':
        return null
    }
  } catch {
    return null
  }
}

function getChannelDisplayName(canonicalId: string): string {
  try {
    const parsed = parseCanonicalChannelId(canonicalId)
    switch (parsed.platform) {
      case 'twitter': return `@${parsed.stableId}`
      case 'youtube': return parsed.stableId
      case 'substack': return `${parsed.stableId}.substack.com`
    }
  } catch {
    return canonicalId
  }
}

function getValidationStatus(item: ContentItemRow): string {
  if (item.error) return item.error
  if (item.validating) return 'Validating...'
  if (item.resolved) {
    const metadata = item.resolved.metadata as Record<string, unknown>
    if (metadata.authorHandle) return `Verified author: ${metadata.authorHandle}`
    if (item.parsed) return `Detected: ${item.parsed.platform} ✓`
  }
  if (item.parsed) return `Detected: ${item.parsed.platform}`
  return ''
}

export function CreateContractPage() {
  const navigate = useNavigate()
  const { channelId: channelIdParam } = useParams<{ platform: string; channelId: string }>()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { state, projects, loading, error: stateError } = useContentFundingState()
  const { resolveContent } = usePlatformApi()

  const canonicalChannelId = channelIdParam ? decodeURIComponent(channelIdParam) : null

  const overview = useMemo(() => {
    if (!state || !canonicalChannelId) return null
    try {
      const channelIdBytes32 = hashCanonicalId(canonicalChannelId)
      const now = BigInt(Math.floor(Date.now() / 1000))
      return getChannelOverview(state, channelIdBytes32, { projects, now })
    } catch {
      return null
    }
  }, [state, canonicalChannelId, projects])

  const [contentItems, setContentItems] = useState<ContentItemRow[]>([{ ...EMPTY_CONTENT_ITEM }])
  const [threshold, setThreshold] = useState('0.5')
  const [deadline, setDeadline] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdContractAddress, setCreatedContractAddress] = useState<string | null>(null)

  const handleContentItemChange = (id: string, field: keyof ContentItemRow, value: string) => {
    setContentItems(prev => prev.map(item => {
      if (item.id !== id) return item

      if (field === 'url') {
        if (!value) {
          return { ...item, url: value, parsed: null, resolved: null, validating: false, error: null }
        }
        try {
          const parsed = parseContentFundingUrl(value)
          setContentItems(current => current.map(i => 
            i.id === id ? { ...i, validating: true } : i
          ))
          resolveContent(value).then(resolved => {
            setContentItems(current => current.map(i => 
              i.id === id ? { ...i, resolved, validating: false } : i
            ))
          }).catch(() => {
            setContentItems(current => current.map(i => 
              i.id === id ? { ...i, resolved: null, validating: false } : i
            ))
          })
          return { ...item, url: value, parsed, error: null }
        } catch (err) {
          return { ...item, url: value, parsed: null, resolved: null, validating: false, error: err instanceof Error ? err.message : 'Invalid URL' }
        }
      }

      return { ...item, [field]: value }
    }))
  }

  const addContentItem = () => {
    setContentItems(prev => [...prev, { ...EMPTY_CONTENT_ITEM, id: Math.random().toString(36).slice(2) }])
  }

  const removeContentItem = (id: string) => {
    if (contentItems.length <= 1) return
    setContentItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmit = async () => {
    if (!walletClient || !publicClient || !address || !canonicalChannelId) return

    const factoryAddress = import.meta.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS
    if (!factoryAddress) {
      setSubmitError('Creator contract factory not configured')
      return
    }

    const validItems = contentItems.filter(item => item.parsed && !item.error)
    if (validItems.length === 0) {
      setSubmitError('At least one valid content item is required')
      return
    }

    const thresholdValue = parseEther(threshold)
    if (thresholdValue <= 0n) {
      setSubmitError('Funding threshold must be positive')
      return
    }

    if (!deadline) {
      setSubmitError('Deadline is required')
      return
    }

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000)
    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      setSubmitError('Deadline must be in the future')
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)
      setSuccess(null)

      const isThirdParty = overview?.channel.state === 'unclaimed' || overview?.channel.state === 'verified'

      let minPurchase = 0n
      if (isThirdParty) {
        const factoryContract = {
          address: factoryAddress as `0x${string}`,
          abi: CreatorAssuranceContractFactoryAbi,
        }
        const clients = {
          walletClient: walletClient as any,
          publicClient: publicClient as any,
          account: address,
        }
        minPurchase = await getThirdPartyMinPurchase(clients, factoryContract)
      }

      const totalInitialValue = validItems.reduce((total, item) => {
        const price = parseEther(item.price || '0')
        const supply = BigInt(item.supply || '0')
        return total + (price * supply)
      }, 0n)

      if (isThirdParty && totalInitialValue < minPurchase) {
        setSubmitError(`Third-party contracts require at least ${formatEther(minPurchase)} ETH initial purchase`)
        return
      }

      const contentUrls = validItems.map(item => item.url)
      const contentSupplies = validItems.map(item => BigInt(item.supply))
      const contentPrices = validItems.map(item => parseEther(item.price))

      const initialPurchaseTokenIds: bigint[] = []
      const initialPurchaseCounts: bigint[] = []

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i]
        let contentSuffix: string

        if (item.parsed!.platform === 'twitter') {
          contentSuffix = (item.parsed as any).tweetId
        } else if (item.parsed!.platform === 'youtube') {
          contentSuffix = (item.parsed as any).videoId
        } else {
          contentSuffix = (item.parsed as any).slug
        }

        const canonicalId = buildCanonicalContentId(canonicalChannelId, contentSuffix)
        const contentId = BigInt(hashCanonicalId(canonicalId))
        const count = BigInt(item.supply)

        if (item.price && parseEther(item.price) > 0n) {
          initialPurchaseTokenIds.push(contentId)
          initialPurchaseCounts.push(count)
        }
      }

      const factoryContract = {
        address: factoryAddress as `0x${string}`,
        abi: CreatorAssuranceContractFactoryAbi,
      }

      const clients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      const result = await createContentFundingContract(clients, factoryContract, {
        channelCanonicalId: canonicalChannelId,
        contentUrls,
        contentSupplies,
        contentPrices,
        threshold: thresholdValue,
        deadline: BigInt(deadlineTimestamp),
        metadataCid: 'bafkriaaaa', // placeholder for now
        erc1155MetadataUri: 'ipfs://bafkriaaaa/',
        erc1155ContractUri: 'ipfs://bafkriaaaa/',
        isThirdParty,
        initialPurchaseTokenIds,
        initialPurchaseCounts,
      })

      setSuccess('Contract created successfully!')
      setCreatedContractAddress(result.contractDetails.contractAddress)
    } catch (err) {
      console.error('Error creating contract:', err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to create contract')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (stateError) {
    return <Alert severity="error">{stateError}</Alert>
  }

  if (!overview || !canonicalChannelId) {
    return (
      <Alert severity="warning">
        Channel not found: {channelIdParam}
      </Alert>
    )
  }

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Contract
        </Typography>
        <Alert severity="info">Connect your wallet to create a content-funding contract.</Alert>
      </Box>
    )
  }

  const isCreatorControlled = overview.channel.state === 'creator-controlled'
  const canCreate = !isCreatorControlled || overview.channel.owner?.toLowerCase() === address?.toLowerCase()

  const displayName = getChannelDisplayName(canonicalChannelId)
  const totalTokenValue = contentItems.reduce((total, item) => {
    const price = parseEther(item.price || '0')
    const supply = BigInt(item.supply || '0')
    return total + (price * supply)
  }, 0n)

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create Contract — {displayName}
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            label={overview.channel.state === 'unclaimed' ? 'Unclaimed' : overview.channel.state === 'verified' ? 'Verified' : 'Creator-Controlled'}
            color={overview.channel.state === 'creator-controlled' ? 'success' : overview.channel.state === 'verified' ? 'warning' : 'default'}
          />
          <Typography variant="body2" color="text.secondary">
            {canonicalChannelId}
          </Typography>
        </Stack>
      </Paper>

      {isCreatorControlled && !canCreate && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Only the verified channel owner can create contracts on creator-controlled channels.
        </Alert>
      )}

      {canCreate && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                Content Items
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add the content you want to fund. Each item will become a separate token type.
              </Typography>

              <Stack spacing={2}>
                {contentItems.map((item) => {
                  const previewUrl = item.url ? getContentPreviewUrl(item.url) : null

                  return (
                    <Box key={item.id} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2 }}>
                      <TextField
                        label="Content URL"
                        value={item.url}
                        onChange={(e) => handleContentItemChange(item.id, 'url', e.target.value)}
                        error={!!item.error}
                        helperText={getValidationStatus(item)}
                        sx={{ flex: 1, minWidth: 250 }}
                        size="small"
                      />
                      {previewUrl && (
                        <IconButton
                          size="small"
                          component="a"
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mt: 0.5 }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      )}
                      <TextField
                        type="number"
                        label="Supply"
                        value={item.supply}
                        onChange={(e) => handleContentItemChange(item.id, 'supply', e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                        size="small"
                      />
                      <TextField
                        type="number"
                        label="Price (ETH)"
                        value={item.price}
                        onChange={(e) => handleContentItemChange(item.id, 'price', e.target.value)}
                        inputProps={{ min: 0, step: 'any' }}
                        sx={{ width: 120 }}
                        size="small"
                      />
                      {contentItems.length > 1 && (
                        <IconButton onClick={() => removeContentItem(item.id)} size="small" aria-label="Remove">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  )
                })}
              </Stack>

              <Button
                startIcon={<AddIcon />}
                onClick={addContentItem}
                size="small"
                sx={{ mt: 1 }}
              >
                Add Content Item
              </Button>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                Funding Details
              </Typography>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <TextField
                  label="Funding Threshold (ETH)"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={{ width: 200 }}
                  size="small"
                />
                <TextField
                  label="Deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 250 }}
                  size="small"
                />
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Total token value: {formatEther(totalTokenValue)} ETH
                {overview.channel.state === 'verified' && totalTokenValue > 0n && (
                  <> — Initial purchase: {formatEther(totalTokenValue)} ETH</>
                )}
              </Typography>
            </Box>

            <Divider />

            {overview.channel.state === 'unclaimed' && (
              <Alert severity="info">
                This channel is unclaimed. Creating a fan-funded contract. Funds will be held in escrow until the creator verifies and claims the channel.
              </Alert>
            )}
            {overview.channel.state === 'verified' && (
              <Alert severity="info">
                This channel is verified. Funds will go directly to the creator.
              </Alert>
            )}
            {overview.channel.state === 'creator-controlled' && canCreate && (
              <Alert severity="success">
                You are the channel owner. Creating a creator contract. No minimum purchase required.
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              sx={{ alignSelf: 'flex-start' }}
            >
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creating Contract...
                </>
              ) : 'Create Contract'}
            </Button>

            {submitError && <Alert severity="error">{submitError}</Alert>}
            {success && (
              <Alert severity="success">
                {success}
                {createdContractAddress && (
                  <Button
                    size="small"
                    onClick={() => navigate(`/projects/${createdContractAddress}`)}
                    sx={{ ml: 1 }}
                  >
                    View Project
                  </Button>
                )}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  )
}