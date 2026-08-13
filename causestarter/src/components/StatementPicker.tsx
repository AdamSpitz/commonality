import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { browseStatements, getStatementWithContent, type StatementListItem } from '@commonality/sdk/conceptspace'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { atomizeCause } from '../lib/causeAssistClient'
import {
  rankStatementMatches, recordStatementPickerEvent,
  type StatementPickerIntent, type StatementPickerSelection,
} from '../lib/statementPicker'

interface Props {
  intent: StatementPickerIntent
  machinery: SDKMachinery
  existingCids: readonly string[]
  disabled?: boolean
  onSelect: (selection: StatementPickerSelection) => void
}

export function StatementPicker({ intent, machinery, existingCids, disabled, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [matches, setMatches] = useState<StatementListItem[]>([])
  const [drafts, setDrafts] = useState<Array<{ text: string; rationale: string }>>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const engaged = useRef(false)

  useEffect(() => () => {
    if (engaged.current) recordStatementPickerEvent(intent, 'flow_abandoned')
  }, [intent])

  const excluded = useMemo(() => new Set([...existingCids, ...rejected]), [existingCids, rejected])

  const retrieve = async () => {
    const intentText = query.trim()
    if (!intentText) return
    engaged.current = true
    setLoading(true)
    setError(undefined)
    setDrafts([])
    recordStatementPickerEvent(intent, 'retrieval_started')
    try {
      const available = statements.length > 0
        ? statements
        : await browseStatements(machinery, { limit: 100, orderBy: 'believerCount' })
      setStatements(available)
      setMatches(rankStatementMatches(intentText, available, excluded).slice(0, 5))
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statement retrieval failed')
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const requestDrafts = async () => {
    recordStatementPickerEvent(intent, 'none_fit')
    recordStatementPickerEvent(intent, 'draft_requested')
    setLoading(true)
    setError(undefined)
    try {
      const response = await atomizeCause({
        description: query.trim(),
        existingPlanks: statements.map((item) => item.title || item.excerpt || '').filter(Boolean),
        count: 4,
      })
      setDrafts(response.planks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft alternatives')
    } finally {
      setLoading(false)
    }
  }

  const choose = (selection: StatementPickerSelection) => {
    engaged.current = false
    recordStatementPickerEvent(intent, selection.source === 'existing' ? 'existing_selected' : 'draft_selected')
    onSelect(selection)
    setQuery('')
    setMatches([])
    setDrafts([])
    setSearched(false)
  }

  const chooseExisting = async (item: StatementListItem) => {
    setLoading(true)
    setError(undefined)
    try {
      const loaded = await getStatementWithContent(machinery, item.cid as IpfsCidV1)
      const exact = loaded?.content && typeof loaded.content.content === 'string'
        ? loaded.content.content.trim()
        : ''
      if (!exact) throw new Error('The exact published statement text is unavailable; it cannot be approved safely.')
      choose({ text: exact, cid: item.cid, source: 'existing' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the exact statement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="statement-picker">
      <Stack spacing={1.5}>
        <div>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Find the statements for your cause</Typography>
          <Typography variant="body2" color="text.secondary">
            Describe what you mean in ordinary language. CauseStarter searches published statements first, then can draft alternatives for you to review.
          </Typography>
        </div>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          multiline minRows={2} fullWidth disabled={disabled || loading}
          label="What should supporters be able to say they believe?"
          placeholder="For example: I want safer crossings around local schools"
          inputProps={{ 'data-testid': 'statement-picker-intent' }}
        />
        <Button variant="contained" onClick={() => void retrieve()} disabled={disabled || loading || !query.trim()} data-testid="statement-picker-search">
          {loading ? <CircularProgress size={18} /> : 'Find existing statements'}
        </Button>
        {error && <Alert severity="warning">{error}</Alert>}
        {matches.map((item) => (
          <Paper key={item.cid} variant="outlined" sx={{ p: 1.5 }}>
            <Typography>{item.title || item.excerpt}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>CID: {item.cid}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="contained" disabled={loading} onClick={() => void chooseExisting(item)}>Load exact text for review</Button>
              <Button size="small" onClick={() => {
                setRejected((current) => new Set(current).add(item.cid))
                setMatches((current) => current.filter((candidate) => candidate.cid !== item.cid))
                recordStatementPickerEvent(intent, 'suggestion_rejected')
              }}>Not what I mean</Button>
            </Stack>
          </Paper>
        ))}
        {searched && drafts.length === 0 && (
          <Button variant="outlined" onClick={() => void requestDrafts()} disabled={disabled || loading || !query.trim()} data-testid="statement-picker-none-fit">
            None of these — draft alternatives
          </Button>
        )}
        {drafts.map((draft) => (
          <Paper key={draft.text} variant="outlined" sx={{ p: 1.5 }}>
            <Typography>{draft.text}</Typography>
            <Typography variant="body2" color="text.secondary">{draft.rationale}</Typography>
            <Button size="small" variant="contained" sx={{ mt: 1 }} onClick={() => choose({ text: draft.text, source: 'drafted' })}>Add to deterministic review</Button>
          </Paper>
        ))}
      </Stack>
    </Paper>
  )
}
