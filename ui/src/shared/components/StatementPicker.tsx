import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import {
  browseStatements,
  getStatementWithContent,
  rankStatementMatches,
  type StatementListItem,
  type StatementPickerIntent,
  type StatementPickerSelection,
} from '@commonality/sdk/conceptspace'
import { getCuratedCollections } from '@commonality/sdk/nudger-publications'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../hooks/useMachinery'
import { loadTrustedNudgers } from '../hooks/useTrustedNudgers'

const EXPLORER_STREAM = 'fundable-project-explorer'

const COPY: Record<StatementPickerIntent, { title: string; prompt: string; action: string }> = {
  cause: { title: 'Find statements for this cause', prompt: 'What should supporters be able to say?', action: 'Use statement' },
  alignment: { title: 'Find what this project serves', prompt: 'What concrete purpose does this project advance?', action: 'Align with this statement' },
  delegation: { title: 'Choose the fund’s purpose', prompt: 'What work may this money be used for?', action: 'Use as funding scope' },
  belief: { title: 'Explore what you believe', prompt: 'What do you care about or want to express?', action: 'Review this statement' },
}

export type StatementPickerDraft = { text: string; rationale: string }
export type StatementPickerTelemetryEvent =
  | 'retrieval_started'
  | 'existing_selected'
  | 'suggestion_rejected'
  | 'none_fit'
  | 'draft_requested'
  | 'draft_selected'
  | 'flow_abandoned'

interface Props {
  intent: StatementPickerIntent
  selectedCid?: string
  excludeCids?: readonly string[]
  disabled?: boolean
  machinery?: SDKMachinery
  onSelect: (selection: StatementPickerSelection) => void
  onNoneFit?: () => void
  /** When set, "none fit" loads draft alternatives instead of (or as well as) onNoneFit. */
  draftFetcher?: (query: string) => Promise<StatementPickerDraft[]>
  onDraftSelect?: (draft: StatementPickerDraft) => void
  onTelemetry?: (event: StatementPickerTelemetryEvent) => void
}

export function StatementPicker({
  intent,
  selectedCid,
  excludeCids = [],
  disabled,
  machinery: machineryOverride,
  onSelect,
  onNoneFit,
  draftFetcher,
  onDraftSelect,
  onTelemetry,
}: Props) {
  const hookedMachinery = useMachinery()
  const machinery = machineryOverride ?? hookedMachinery
  const copy = COPY[intent]
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<StatementListItem[]>([])
  const [matches, setMatches] = useState<StatementListItem[]>([])
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [review, setReview] = useState<StatementPickerSelection | null>(null)
  const [drafts, setDrafts] = useState<StatementPickerDraft[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const engaged = useRef(false)
  const excluded = useMemo(
    () => new Set([selectedCid, ...excludeCids, ...rejected].filter(Boolean) as string[]),
    [selectedCid, excludeCids, rejected],
  )

  useEffect(() => () => {
    if (engaged.current) onTelemetry?.('flow_abandoned')
  }, [onTelemetry])

  const retrieve = async () => {
    if (!query.trim()) return
    engaged.current = true
    onTelemetry?.('retrieval_started')
    setLoading(true)
    setError(null)
    setReview(null)
    setDrafts([])
    try {
      const available = catalog.length > 0 ? catalog : await (async () => {
        const general = await browseStatements(machinery, { limit: 100, orderBy: 'believerCount' })
        const nudgers = loadTrustedNudgers().map((entry) => entry.address)
        if (nudgers.length === 0) return general
        const collections = await getCuratedCollections(machinery, nudgers, EXPLORER_STREAM).catch(() => [])
        const curated: StatementListItem[] = collections.flatMap((collection) => collection.entries.map((entry) => ({
          id: entry.cid,
          cid: entry.cid,
          title: entry.label,
          excerpt: `${entry.label} ${entry.topicArea}`,
          statementType: '', believerCount: 0, disbelieverCount: 0, createdAt: '',
        })))
        return [...new Map([...curated, ...general].map((item) => [item.cid, item])).values()]
      })()
      setCatalog(available)
      setMatches(rankStatementMatches(query, available, excluded).slice(0, 5))
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statement retrieval failed')
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const loadForReview = async (item: StatementListItem) => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await getStatementWithContent(machinery, item.cid as IpfsCidV1)
      const text = loaded?.content && typeof loaded.content.content === 'string' ? loaded.content.content.trim() : ''
      if (!text) throw new Error('The exact published text is unavailable, so it cannot be approved safely.')
      setReview({ cid: item.cid, text, source: 'existing' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the exact statement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid={`statement-picker-${intent}`}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>{copy.title}</Typography>
          <Typography variant="body2" color="text.secondary">Describe your intent normally. Existing immutable statements are searched before anything new is created.</Typography>
        </Box>
        <TextField
          multiline
          minRows={2}
          label={copy.prompt}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled || loading}
          inputProps={{ 'data-testid': 'statement-picker-intent' }}
        />
        <Button
          variant="outlined"
          onClick={() => void retrieve()}
          disabled={disabled || loading || !query.trim()}
          data-testid="statement-picker-search"
        >
          {loading ? <CircularProgress size={18} /> : 'Find existing statements'}
        </Button>
        {error && <Alert severity="warning">{error}</Alert>}
        {matches.map((item) => (
          <Paper variant="outlined" sx={{ p: 1.5 }} key={item.cid}>
            <Typography>{item.title || item.excerpt || item.cid}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>CID: {item.cid}</Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Button size="small" onClick={() => void loadForReview(item)} disabled={loading}>Review exact text</Button>
              <Button size="small" color="inherit" onClick={() => {
                setRejected((current) => new Set(current).add(item.cid))
                setMatches((current) => current.filter((candidate) => candidate.cid !== item.cid))
                onTelemetry?.('suggestion_rejected')
              }}>Not this one</Button>
            </Stack>
          </Paper>
        ))}
        {review && (
          <Alert severity="info" icon={false}>
            <Typography fontWeight={700}>Exact immutable statement</Typography>
            <Typography sx={{ my: 1 }}>{review.text}</Typography>
            <Typography variant="caption" sx={{ display: 'block', overflowWrap: 'anywhere' }}>CID: {review.cid}</Typography>
            <Button variant="contained" size="small" sx={{ mt: 1 }} onClick={() => {
              engaged.current = false
              onTelemetry?.('existing_selected')
              onSelect(review)
            }} disabled={disabled}>{copy.action}</Button>
          </Alert>
        )}
        {searched && matches.length === 0 && !review && drafts.length === 0 && (
          <Alert severity="info">No existing statements matched those words. Refine the description or use the correction path below.</Alert>
        )}
        {searched && draftFetcher && onDraftSelect && drafts.length === 0 && (
          <Button
            size="small"
            data-testid="statement-picker-none-fit"
            onClick={() => {
              void (async () => {
                onTelemetry?.('none_fit')
                onTelemetry?.('draft_requested')
                setLoading(true)
                setError(null)
                try {
                  setDrafts(await draftFetcher(query.trim()))
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not draft alternatives')
                } finally {
                  setLoading(false)
                }
              })()
            }}
            disabled={disabled || loading || !query.trim()}
          >
            None of these — draft alternatives
          </Button>
        )}
        {drafts.map((draft) => (
          <Paper key={draft.text} variant="outlined" sx={{ p: 1.5 }}>
            <Typography>{draft.text}</Typography>
            <Typography variant="body2" color="text.secondary">{draft.rationale}</Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Button size="small" variant="contained" onClick={() => {
                engaged.current = false
                onTelemetry?.('draft_selected')
                onDraftSelect?.(draft)
              }}>
                Use this draft
              </Button>
              <Button size="small" color="inherit" onClick={() => {
                setDrafts((current) => current.filter((candidate) => candidate.text !== draft.text))
                onTelemetry?.('suggestion_rejected')
              }}>
                Not what I mean
              </Button>
            </Stack>
          </Paper>
        ))}
        {searched && onNoneFit && !draftFetcher && (
          <Button size="small" onClick={onNoneFit}>None fit — create a statement first</Button>
        )}
      </Stack>
    </Paper>
  )
}
