// REFACTOR-WANTED: this file is large (~830 lines). It mixes several
// concerns that could be extracted (form sections, validation, and the submit/transaction flow). Left intact for now — please split
// it up when next doing substantial work here. See workflow/reviews/ui-deep-dive-2026-06-25.md (issue #3).
import { useState, useMemo, useEffect } from 'react'
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
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useAccount, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import { parseCanonicalChannelId, hashCanonicalId, getChannelOverview, parseContentFundingUrl, type ParsedContentFundingUrl } from '@commonality/sdk/content-funding'
import { createDefaultDocumentStore, createDisplayableDocument } from '@commonality/sdk/displayable-documents'
import { CreatorAssuranceContractFactoryAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { createContentFundingContract, getThirdPartyMinPurchase } from '@commonality/sdk/content-funding'
import { getChannelDisplayLabels } from '../channelDisplay'
import { useContentFundingState } from '../hooks/useContentFundingState'
import { usePlatformApi } from '../hooks/usePlatformApi'
import { getAppUrl } from '../../shared'
import { DEFAULT_PAYMENT_CURRENCY, formatCurrencyAmount, getConfiguredPaymentCurrency } from '../../shared'
import { usePaymentTokenCurrency } from '../../shared'
import { projectPathForAddress } from '../../shared'
import { useWriteClients } from '../../shared'

interface ContentItemRow {
  id: string
  url: string
  supply: string
  price: string
  parsed: ParsedContentFundingUrl | null
  resolved: { channelId: string; canonicalId: string; metadata: Record<string, unknown> } | null
  validating: boolean
  error: string | null
  alreadyRegistered: boolean
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
  alreadyRegistered: false,
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

function getYouTubeThumbnailFromUrl(url: string): string | null {
  try {
    const parsed = parseContentFundingUrl(url)
    if (parsed.platform === 'youtube' && parsed.videoId) {
      return `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`
    }
  } catch {
    // ignore parse errors, return null
  }
  return null
}

function ContentUrlPreview({ url }: { url: string }) {
  const thumbnail = getYouTubeThumbnailFromUrl(url)

  if (!thumbnail) return null

  return (
    <Box
      component="a"
      href={getContentPreviewUrl(url) ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ display: 'block', lineHeight: 0 }}
    >
      <Box
        component="img"
        src={thumbnail}
        alt="YouTube preview"
        sx={{
          width: 120,
          height: 68,
          objectFit: 'cover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Box>
  )
}

function getValidationStatus(item: ContentItemRow): string {
  if (item.error) return item.error
  if (item.validating) return 'Validating...'
  if (item.alreadyRegistered) return 'Already registered in an active contract'
  if (item.resolved) {
    const metadata = item.resolved.metadata as Record<string, unknown>
    if (metadata.authorHandle) return `Verified author: ${metadata.authorHandle}`
    if (item.parsed) return `Detected: ${item.parsed.platform} â`
  }
  if (item.parsed) return `Detected: ${item.parsed.platform}`
  return ''
}

function isContentAlreadyRegistered(
  state: ReturnType<typeof useContentFundingState>['state'],
  canonicalId: string,
): boolean {
  if (!state) return false

  return [...new Set(state.contentRegistry.items.values())].some(item => (
    item.canonicalId === canonicalId && item.status === 'active'
  ))
}

interface CreateContractPageProps {
  titlePrefix?: string
  connectPrompt?: string
  contentItemsDescription?: string
  contractDetailsDescription?: string
  createButtonLabel?: string
  viewButtonLabel?: string
  shareSuccessHeading?: string
  unclaimedAlert?: string
  verifiedAlert?: string
  creatorControlledAlert?: string
  contractPathForAddress?: (address: string) => string
}

export function CreateContractPage({
  titlePrefix = 'Create Contract',
  connectPrompt = 'Connect your wallet to create a content-funding contract.',
  contentItemsDescription = 'Add the content you want to fund. Each item will become a separate token type.',
  contractDetailsDescription = 'These details will be stored as a content-addressed document and associated with the contract.',
  createButtonLabel = 'Create Contract',
  viewButtonLabel = 'View Project',
  shareSuccessHeading = 'Share this link with the creator to claim their funds:',
  unclaimedAlert = 'This channel is unclaimed. Creating a fan-funded contract. Funds will be held in escrow until the creator verifies and claims the channel.',
  verifiedAlert = 'This channel is verified. Funds will go directly to the creator.',
  creatorControlledAlert = 'You are the channel owner. Creating a creator contract. No minimum purchase required.',
  contractPathForAddress = projectPathForAddress,
}: CreateContractPageProps) {
  const navigate = useNavigate()
  const { channelId: channelIdParam } = useParams<{ platform: string; channelId: string }>()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const writeClients = useWriteClients(address)
  const { state, projects, loading, error: stateError, machinery, channelDisplayMetadata = new Map() } = useContentFundingState()
  const { resolveContent } = usePlatformApi()

  const canonicalChannelId = channelIdParam ? decodeURIComponent(channelIdParam) : null

  const channelParsed = useMemo(() => {
    if (!canonicalChannelId) return null
    try {
      return parseCanonicalChannelId(canonicalChannelId)
    } catch {
      return null
    }
  }, [canonicalChannelId])

  const overview = useMemo(() => {
    if (!state || !canonicalChannelId) return null
    try {
      const channelIdBytes32 = hashCanonicalId(canonicalChannelId)
      // eslint-disable-next-line react-hooks/purity -- snapshot of current time for deadline math, not used for rendering consistency
      const now = BigInt(Math.floor(Date.now() / 1000))
      return getChannelOverview(state, channelIdBytes32, { projects, now })
    } catch {
      return null
    }
  }, [state, canonicalChannelId, projects])

  const claimUrl = canonicalChannelId && channelParsed
    ? getAppUrl(`/content/${channelParsed.platform}/${encodeURIComponent(canonicalChannelId)}`)
    : null

  const factoryAddress = import.meta.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS
  const [paymentTokenAddress, setPaymentTokenAddress] = useState<string | null>(null)
  const { currency: loadedPaymentCurrency, loading: paymentCurrencyLoading } = usePaymentTokenCurrency(publicClient, paymentTokenAddress)
  const paymentCurrency = loadedPaymentCurrency ?? getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY
  const paymentSymbol = paymentCurrency.symbol

  const parsePaymentAmount = (value: string) => {
    return parseUnits(value, paymentCurrency.decimals)
  }

  useEffect(() => {
    const configuredPaymentCurrency = getConfiguredPaymentCurrency()
    if (!publicClient || !factoryAddress || typeof publicClient.readContract !== 'function') {
      setPaymentTokenAddress(configuredPaymentCurrency?.tokenAddress ?? null)
      return
    }

    let cancelled = false
    publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: CreatorAssuranceContractFactoryAbi,
      functionName: 'paymentToken',
    }).then((tokenAddress) => {
      if (!cancelled) setPaymentTokenAddress(tokenAddress as string)
    }).catch(() => {
      if (!cancelled) setPaymentTokenAddress(configuredPaymentCurrency?.tokenAddress ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [factoryAddress, publicClient])

  useEffect(() => {
    if (!state) return
    setContentItems(prev => prev.map(item => {
      if (!item.resolved) return item
      return { ...item, alreadyRegistered: isContentAlreadyRegistered(state, item.resolved.canonicalId) }
    }))
  }, [state])

  const [contentItems, setContentItems] = useState<ContentItemRow[]>([{ ...EMPTY_CONTENT_ITEM }])
  const [threshold, setThreshold] = useState('0.5')
  const [deadline, setDeadline] = useState('')
  const [contractName, setContractName] = useState('')
  const [contractDescription, setContractDescription] = useState('')
  const [roundType, setRoundType] = useState<'existing' | 'future'>('existing')
  const [receiptSupply, setReceiptSupply] = useState('100')
  const [receiptPrice, setReceiptPrice] = useState('0.01')
  const [receiptMetadataUri, setReceiptMetadataUri] = useState('')
  const [receiptContractUri, setReceiptContractUri] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdContractAddress, setCreatedContractAddress] = useState<string | null>(null)

  const handleContentItemChange = (id: string, field: keyof ContentItemRow, value: string) => {
    setContentItems(prev => prev.map(item => {
      if (item.id !== id) return item

      if (field === 'url') {
        if (!value) {
          return { ...item, url: value, parsed: null, resolved: null, validating: false, error: null, alreadyRegistered: false }
        }
        try {
          const parsed = parseContentFundingUrl(value)
          setContentItems(current => current.map(i => 
            i.id === id ? { ...i, validating: true, alreadyRegistered: false } : i
          ))
          resolveContent(value).then(resolved => {
            setContentItems(current => current.map(i => 
              i.id === id && i.url === value
                ? {
                    ...i,
                    resolved,
                    validating: false,
                    alreadyRegistered: isContentAlreadyRegistered(state, resolved.canonicalId),
                  }
                : i
            ))
          }).catch(() => {
            setContentItems(current => current.map(i => 
              i.id === id && i.url === value ? { ...i, resolved: null, validating: false } : i
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
    if (roundType === 'future') {
      setSubmitError('Future-content round deployment is not wired yet. The UI is ready, but the SDK/indexer actions for ProspectiveContentTokens and materialization still need to be added.')
      return
    }

    if (!writeClients || !address || !canonicalChannelId) return

    if (!factoryAddress) {
      setSubmitError('Creator contract factory not configured')
      return
    }

    const validItems = contentItems.filter(item => item.parsed && !item.error)
    if (validItems.length === 0) {
      setSubmitError('At least one valid content item is required')
      return
    }

    const thresholdValue = parsePaymentAmount(threshold)
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

    const unresolvedItems = validItems.filter(item => !item.resolved)
    if (unresolvedItems.length > 0) {
      setSubmitError('All content items must be verified. Please ensure each URL resolves successfully.')
      return
    }

    const mismatchedItems = validItems.filter(item => {
      if (!item.resolved) return false
      return item.resolved.channelId !== canonicalChannelId
    })
    if (mismatchedItems.length > 0) {
      setSubmitError(`Some content items belong to different channels. All content must belong to ${getChannelDisplayLabels(canonicalChannelId, channelDisplayMetadata.get(canonicalChannelId)).primary}.`)
      return
    }

    if (state) {
      const alreadyRegisteredItems = validItems
        .filter(item => item.resolved && isContentAlreadyRegistered(state, item.resolved.canonicalId))
        .map(item => item.url)

      if (alreadyRegisteredItems.length > 0) {
        setSubmitError(`The following content items are already registered in active contracts: ${alreadyRegisteredItems.join(', ')}`)
        return
      }
    }

    const submitItems = validItems.filter(item => !item.alreadyRegistered)
    if (submitItems.length === 0) {
      setSubmitError('At least one valid content item is required')
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)
      setSuccess(null)

      const isThirdParty = overview?.channel.state === 'unclaimed'

      let minPurchase = 0n
      if (isThirdParty) {
        const factoryContract = {
          address: factoryAddress as `0x${string}`,
          abi: CreatorAssuranceContractFactoryAbi,
        }
        const clients = writeClients!
        minPurchase = await getThirdPartyMinPurchase(clients, factoryContract)
      }

      const totalInitialValue = submitItems.reduce((total, item) => {
        const price = parsePaymentAmount(item.price || '0')
        const supply = BigInt(item.supply || '0')
        return total + (price * supply)
      }, 0n)

      if (isThirdParty && totalInitialValue < minPurchase) {
        setSubmitError(`Third-party contracts require at least ${formatCurrencyAmount(minPurchase, paymentCurrency)} initial purchase`)
        return
      }

      const contentUrls = submitItems.map(item => item.url)
      const contentSupplies = submitItems.map(item => BigInt(item.supply))
      const contentPrices = submitItems.map(item => parsePaymentAmount(item.price))

      const initialPurchaseIndices: bigint[] = []
      const initialPurchaseCounts: bigint[] = []

      for (let i = 0; i < submitItems.length; i++) {
        const item = submitItems[i]
        const count = BigInt(item.supply)

        if (item.price && parsePaymentAmount(item.price) > 0n) {
          initialPurchaseIndices.push(BigInt(i))
          initialPurchaseCounts.push(count)
        }
      }

      const factoryContract = {
        address: factoryAddress as `0x${string}`,
        abi: CreatorAssuranceContractFactoryAbi,
      }

      const clients = writeClients!

      const metadata = {
        name: contractName.trim() || `Content Funding for ${displayName}`,
        description: contractDescription.trim() || `Content funding contract for ${canonicalChannelId}`,
        channel: canonicalChannelId,
        contentCount: submitItems.length,
        threshold: thresholdValue.toString(),
        deadline: deadlineTimestamp,
      }
      const documentStore = createDefaultDocumentStore(machinery, {
        clients,
        ...(machinery.contractAddresses?.publishedData
          ? { publishedDataContract: { address: machinery.contractAddresses.publishedData, abi: PublishedDataAbi } }
          : {}),
      })
      const metadataPublication = await documentStore.publish(createDisplayableDocument({
        format: 'markdown-restricted',
        content: metadata.description,
        extras: {
          statementType: 'content-funding-contract-metadata',
          ...metadata,
        },
      }))
      const metadataCid = metadataPublication.cid

      const result = await createContentFundingContract(clients, factoryContract, {
        channelCanonicalId: canonicalChannelId,
        contentUrls,
        contentSupplies,
        contentPrices,
        threshold: thresholdValue,
        deadline: BigInt(deadlineTimestamp),
        metadataCid,
        erc1155MetadataUri: `ipfs://${metadataCid}/`,
        erc1155ContractUri: `ipfs://${metadataCid}`,
        isThirdParty,
        initialPurchaseIndices,
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
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5" component="h1">
            Channel not found
          </Typography>
          <Typography color="text.secondary">
            {canonicalChannelId
              ? `We couldn’t load an indexed channel for ${canonicalChannelId} yet. Start from a creator or content URL and we’ll take you to the right channel to begin.`
              : 'We couldn’t read that channel link. Start from a creator or content URL instead.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={() => navigate('/content/new')}>
              Start a contract
            </Button>
            <Button variant="text" onClick={() => navigate('/content')}>
              Browse creators
            </Button>
          </Stack>
        </Stack>
      </Paper>
    )
  }

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {titlePrefix}
        </Typography>
        <Alert severity="info">{connectPrompt}</Alert>
      </Box>
    )
  }

  const isCreatorControlled = overview.channel.state === 'creator-controlled'
  const canCreate = !isCreatorControlled || overview.channel.owner?.toLowerCase() === address?.toLowerCase()

  const displayLabels = getChannelDisplayLabels(canonicalChannelId, channelDisplayMetadata.get(canonicalChannelId))
  const displayName = displayLabels.primary
  const totalTokenValue = contentItems.reduce((total, item) => {
    const price = parsePaymentAmount(item.price || '0')
    const supply = BigInt(item.supply || '0')
    return total + (price * supply)
  }, 0n)

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {titlePrefix} â {displayName}
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
                What are you funding?
              </Typography>
              <RadioGroup
                row
                value={roundType}
                onChange={(event) => setRoundType(event.target.value as 'existing' | 'future')}
              >
                <FormControlLabel value="existing" control={<Radio />} label="Fund existing content" />
                <FormControlLabel value="future" control={<Radio />} label="Fund future content (coming soon)" disabled />
              </RadioGroup>
              <Typography variant="body2" color="text.secondary">
                Existing-content rounds list posts/videos/articles now. Future-content rounds are not available yet, so start with existing content for this MVP.
              </Typography>
            </Box>

            <Divider />

            {roundType === 'existing' ? (
            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                Content Items
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {contentItemsDescription}
              </Typography>

              <Stack spacing={2}>
                {contentItems.map((item) => {
                  const previewUrl = item.url ? getContentPreviewUrl(item.url) : null

                  return (
                    <Box key={item.id} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2 }}>
                      {item.url && <ContentUrlPreview url={item.url} />}
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
                        label={`Price (${paymentSymbol})`}
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
            ) : (
            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                Future-content promise
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Describe the future chunk of work. Backers receive non-transferable receipts now, then claim transferable content-item tokens after you publish and materialize the actual items.
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Round description"
                  value={contractDescription}
                  onChange={(e) => setContractDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  placeholder="e.g., Five June explainers about housing policy."
                />
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <TextField
                    type="number"
                    label="Receipt token supply"
                    value={receiptSupply}
                    onChange={(e) => setReceiptSupply(e.target.value)}
                    inputProps={{ min: 1 }}
                    sx={{ width: 190 }}
                    size="small"
                  />
                  <TextField
                    type="number"
                    label={`Receipt price (${paymentSymbol})`}
                    value={receiptPrice}
                    onChange={(e) => setReceiptPrice(e.target.value)}
                    inputProps={{ min: 0, step: 'any' }}
                    sx={{ width: 190 }}
                    size="small"
                  />
                </Stack>
                <TextField
                  label="Receipt token metadata URI"
                  value={receiptMetadataUri}
                  onChange={(e) => setReceiptMetadataUri(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="ipfs://.../{id}.json â should say receipts are non-transferable"
                />
                <TextField
                  label="Receipt contract URI"
                  value={receiptContractUri}
                  onChange={(e) => setReceiptContractUri(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="ipfs://..."
                />
              </Stack>
              <Alert severity="info" sx={{ mt: 2 }}>
                MVP rule: future-content rounds are creator-initiated only. Fan-created future-content rounds stay hidden until consent/product rules are explicit.
              </Alert>
            </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                Funding Details
              </Typography>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <TextField
                  label={`Funding Threshold (${paymentSymbol})`}
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
                {roundType === 'existing'
                  ? <>Total token value: {formatCurrencyAmount(totalTokenValue, paymentCurrency)}</>
                  : <>Total receipt value: {formatCurrencyAmount(parsePaymentAmount(receiptPrice || '0') * BigInt(receiptSupply || '0'), paymentCurrency)}</>}
                {roundType === 'existing' && overview.channel.state === 'verified' && totalTokenValue > 0n && (
                  <> â Initial purchase: {formatCurrencyAmount(totalTokenValue, paymentCurrency)}</>
                )}
              </Typography>
            </Box>

            <Divider />

            {overview.channel.state === 'unclaimed' && (
              <Alert severity="info">
                {unclaimedAlert}
              </Alert>
            )}
            {overview.channel.state === 'verified' && (
              <Alert severity="info">
                {verifiedAlert}
              </Alert>
            )}
            {overview.channel.state === 'creator-controlled' && canCreate && (
              <Alert severity="success">
                {creatorControlledAlert}
              </Alert>
            )}

            <Divider />

            <Box>
              <Typography variant="h6" component="h2" gutterBottom>
                Contract Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {contractDetailsDescription}
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Contract Name"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Support for @username's Q2 content"
                />
                {roundType === 'existing' && (
                  <TextField
                    label="Description"
                    value={contractDescription}
                    onChange={(e) => setContractDescription(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    placeholder="Describe what this funding supports..."
                  />
                )}
              </Stack>
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
                  Creating Contract...
                </>
              ) : roundType === 'future' ? 'Create Future-Content Round' : createButtonLabel}
            </Button>

            {submitError && <Alert severity="error">{submitError}</Alert>}
            {success && (
              <Stack spacing={2}>
                <Alert severity="success">
                  {success}
                  {createdContractAddress && (
                    <Button
                      size="small"
                      onClick={() => navigate(contractPathForAddress(createdContractAddress))}
                      sx={{ ml: 1 }}
                    >
                      {viewButtonLabel}
                    </Button>
                  )}
                </Alert>
                {canonicalChannelId && overview && channelParsed && (
                  <Alert severity="info">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {shareSuccessHeading}
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {claimUrl}
                    </Box>
                  </Alert>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  )
}
