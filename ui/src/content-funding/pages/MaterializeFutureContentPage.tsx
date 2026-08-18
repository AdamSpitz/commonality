import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAccount } from 'wagmi'
import { addMaterializedContent, claimMaterializedContent, createMaterializedContentTokens, getMaterializedClaimStates, getMaterializedContentOnchain, getProspectiveRoundOnchainState, hashCanonicalId, parseContentFundingUrl, type MaterializedContentClaimState } from '@commonality/sdk/content-funding'
import { getChannelDisplayLabels } from '../channelDisplay'
import { useMachinery, useWriteClients, InfoChip } from '../../shared'
import { CONTENT_ITEM_CHIP_TOOLTIPS } from '../chipTooltips'
import { usePlatformApi } from '../hooks/usePlatformApi'

interface MaterializedContentRow {
  id: string
  url: string
}

function newRow(): MaterializedContentRow {
  return { id: Math.random().toString(36).slice(2), url: '' }
}

function clearClaimStates(previous: Map<string, MaterializedContentClaimState>) {
  return previous.size === 0 ? previous : new Map<string, MaterializedContentClaimState>()
}

/**
 * Describe one account's position on a content item, stating both numbers
 * rather than hiding a mismatch between them.
 *
 * Entitlement is the CURRENT receipt balance while claimed is permanent, so an
 * account that claimed and later burned receipts shows more claimed than it now
 * holds. Receipts are non-transferable, so burning is the only way this
 * happens. That surplus is reported outright rather than hidden.
 *
 * Note what is not knowable here: claims forgone by burning receipts BEFORE an
 * item was materialized would need the receipt token's transfer history to
 * establish a high-water mark. Neither claimedAmount nor ContentTokenClaimed
 * records it, so this never implies a forgone figure it cannot support. See
 * specs/tech/subsystems/content-funding/materialization.md for the open
 * question about whether this model should change.
 */
function claimSummary({ entitlement, claimed, claimable }: MaterializedContentClaimState): string {
  if (claimable > 0n) {
    return claimed > 0n
      ? `${claimable.toString()} claimable · ${claimed.toString()} of ${entitlement.toString()} receipts already claimed`
      : `${claimable.toString()} claimable · ${entitlement.toString()} receipts held`
  }
  if (claimed === 0n) return 'No receipts for this round, so nothing to claim.'
  if (claimed > entitlement) {
    return `Claimed ${claimed.toString()} · only ${entitlement.toString()} receipts held now, so nothing further is claimable`
  }
  return `Claimed ${claimed.toString()} of ${entitlement.toString()}`
}

export function MaterializeFutureContentPage() {
  const { platform, channelId: channelIdParam, roundAddress } = useParams<{ platform: string; channelId: string; roundAddress: string }>()
  const { address, isConnected } = useAccount()
  const clients = useWriteClients(address)
  const machinery = useMachinery()
  const { resolveContent } = usePlatformApi()
  const canonicalChannelId = channelIdParam ? decodeURIComponent(channelIdParam) : ''
  const displayLabels = useMemo(() => getChannelDisplayLabels(canonicalChannelId), [canonicalChannelId])
  const [contentRows, setContentRows] = useState<MaterializedContentRow[]>([newRow()])
  const [tokenMetadataUri, setTokenMetadataUri] = useState('')
  const [contractUri, setContractUri] = useState('')
  const [materializedToken, setMaterializedToken] = useState<`0x${string}` | null>(null)
  const [roundChannelMatches, setRoundChannelMatches] = useState<boolean | null>(null)
  const [roundLoadError, setRoundLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [materializedContent, setMaterializedContent] = useState<{ contentId: bigint; canonicalId: string }[]>([])
  const [claimingContentId, setClaimingContentId] = useState<bigint | null>(null)
  const [claimStates, setClaimStates] = useState<Map<string, MaterializedContentClaimState>>(new Map())

  const refreshClaimStates = useCallback(async (token: `0x${string}` | null, content: { contentId: bigint }[]) => {
    // Keep the identity of an already-empty map: this runs from an effect, so a
    // fresh Map each time would re-render on every dependency change.
    if (!token || !address || content.length === 0) { setClaimStates(clearClaimStates); return }
    try {
      const states = await getMaterializedClaimStates(machinery, token, address, content.map((item) => item.contentId))
      setClaimStates(new Map(states.map((state) => [state.contentId.toString(), state])))
    } catch {
      // Claim state is supplementary: a failed read must not hide the content list.
      setClaimStates(clearClaimStates)
    }
  }, [address, machinery])

  useEffect(() => {
    void refreshClaimStates(materializedToken, materializedContent)
  }, [materializedToken, materializedContent, refreshClaimStates])

  useEffect(() => {
    if (!roundAddress || !canonicalChannelId) return
    setLoading(true)
    setRoundChannelMatches(null)
    setRoundLoadError(null)
    getProspectiveRoundOnchainState(machinery, roundAddress as `0x${string}`).then((round) => {
      setMaterializedToken(round.materializedToken)
      setRoundChannelMatches(round.channelId.toLowerCase() === hashCanonicalId(canonicalChannelId).toLowerCase())
      if (round.materializedToken) {
        void getMaterializedContentOnchain(machinery, round.materializedToken)
          .then(setMaterializedContent)
          .catch(() => setMaterializedContent([]))
      } else {
        setMaterializedContent([])
      }
    }).catch((reason) => {
      setRoundLoadError(reason instanceof Error ? reason.message : 'Could not load round')
    }).finally(() => setLoading(false))
  }, [canonicalChannelId, machinery, roundAddress])

  const submit = async () => {
    if (!clients || !roundAddress || !roundChannelMatches) return
    setSubmitting(true); setError(null); setSuccess(null)
    try {
      const resolved = await Promise.all(contentRows.map((row) => resolveContent(row.url)))
      if (resolved.some((item) => item.channelId !== canonicalChannelId)) throw new Error('Every content URL must belong to this channel')
      const suffixes = contentRows.map((row) => {
        const parsed = parseContentFundingUrl(row.url)
        return parsed.platform === 'twitter' ? parsed.tweetId : parsed.platform === 'youtube' ? parsed.videoId : parsed.slug
      })
      let token = materializedToken
      if (!token) {
        const factory = machinery.contractAddresses?.prospectiveContentRoundFactory
        if (!factory) throw new Error('Prospective content round factory not configured')
        const result = await createMaterializedContentTokens(clients, factory, roundAddress as `0x${string}`, tokenMetadataUri, contractUri)
        token = result.tokenContract; setMaterializedToken(token)
      }
      const result = await addMaterializedContent(clients, token, suffixes)
      setSuccess(`Content materialized. Transaction: ${result.hash}`)
      setMaterializedContent(await getMaterializedContentOnchain(machinery, token))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Materialization failed') }
    finally { setSubmitting(false) }
  }

  const claim = async (contentId: bigint) => {
    if (!clients || !materializedToken) return
    setClaimingContentId(contentId); setError(null); setSuccess(null)
    try {
      const result = await claimMaterializedContent(clients, materializedToken, contentId)
      setSuccess(`Claimed content recognition. Transaction: ${result.hash}`)
      await refreshClaimStates(materializedToken, materializedContent)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Claim failed')
    } finally {
      setClaimingContentId(null)
    }
  }

  const setRowUrl = (id: string, url: string) => {
    setContentRows((rows) => rows.map((row) => row.id === id ? { ...row, url } : row))
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Materialize future content
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Attach published posts, videos, or articles to a funded future-content round so original contributors can claim their content tokens.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={platform ?? 'content'} size="small" />
            <Chip label={displayLabels.primary || canonicalChannelId} size="small" variant="outlined" />
            <InfoChip label="Future-content round" color="secondary" size="small" title={CONTENT_ITEM_CHIP_TOOLTIPS.futureContent} />
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">Round address</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{roundAddress}</Typography>
          </Box>
          {loading ? <Alert severity="info">Loading round state…</Alert> : roundLoadError ? <Alert severity="error">Could not load round: {roundLoadError}</Alert> : !roundChannelMatches ? <Alert severity="error">This round does not belong to the channel in this URL.</Alert> : materializedToken ? <Alert severity="success">Materialized collection: {materializedToken}</Alert> : <Alert severity="info">This round has not created its materialized collection yet. The transaction will succeed only after its funding condition succeeds.</Alert>}
        </Stack>
      </Paper>

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Connect the creator wallet for this channel before materializing content.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" component="h2" gutterBottom>Published content</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add one or more URLs from the same platform/channel. The final implementation should reuse the existing content URL resolution and channel-ownership checks.
            </Typography>
            <Stack spacing={1.5}>
              {contentRows.map((row) => (
                <Stack key={row.id} direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Content URL"
                    value={row.url}
                    onChange={(event) => setRowUrl(row.id, event.target.value)}
                    fullWidth
                    size="small"
                    placeholder="https://..."
                  />
                  {contentRows.length > 1 && (
                    <Button
                      aria-label="Remove content URL"
                      color="inherit"
                      onClick={() => setContentRows((rows) => rows.filter((candidate) => candidate.id !== row.id))}
                    >
                      <DeleteIcon />
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
            <Button startIcon={<AddIcon />} size="small" onClick={() => setContentRows((rows) => [...rows, newRow()])} sx={{ mt: 1 }}>
              Add content URL
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" component="h2" gutterBottom>Materialized token metadata</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Needed the first time this round creates a materialized token collection. Like the original future-content receipts, these tokens are non-transferable: they are permanent recognition for backing the work, not something to trade.
            </Typography>
            <Stack spacing={2}>
              <TextField label="Token metadata URI" value={tokenMetadataUri} onChange={(event) => setTokenMetadataUri(event.target.value)} fullWidth size="small" placeholder="ipfs://.../{id}.json" />
              <TextField label="Contract URI" value={contractUri} onChange={(event) => setContractUri(event.target.value)} fullWidth size="small" placeholder="ipfs://..." />
            </Stack>
          </Box>

          {materializedContent.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Materialized content</Typography>
              <Stack spacing={1}>
                {materializedContent.map((item) => {
                  const claimState = claimStates.get(item.contentId.toString())
                  const nothingToClaim = claimState !== undefined && claimState.claimable === 0n
                  return (
                    <Paper key={item.contentId.toString()} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                        <Box>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{item.canonicalId}</Typography>
                          {claimState && (
                            <Typography variant="caption" color="text.secondary">{claimSummary(claimState)}</Typography>
                          )}
                        </Box>
                        <Button disabled={!isConnected || claimingContentId !== null || nothingToClaim} onClick={() => { void claim(item.contentId) }} size="small" variant="outlined">
                          {claimingContentId === item.contentId ? 'Claiming…' : nothingToClaim ? 'Claimed' : 'Claim my content tokens'}
                        </Button>
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={!isConnected || submitting || loading || !roundChannelMatches || contentRows.some((row) => !row.url)} onClick={submit}>
              {submitting ? 'Materializing…' : materializedToken ? 'Add content' : 'Create collection and materialize'}
            </Button>
            <Button component={RouterLink} to={`/content/${platform ?? 'twitter'}/${encodeURIComponent(canonicalChannelId)}`}>
              Back to channel
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
