import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { getStatementWithContent, type Statement } from '@commonality/sdk/conceptspace'
import type { DisplayableDocument } from '@commonality/sdk/displayable-documents'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { SupportButton } from '../components/SupportButton'
import { MonthlyPledgeSignal } from '../components/MonthlyPledgeSignal'
import { createCausePath } from '../lib/causeStore'
import { useMachinery } from '../lib/useMachinery'

function documentText(doc: DisplayableDocument | null | undefined): string | null {
  if (!doc) return null
  const content = (doc as { content?: unknown }).content
  if (typeof content === 'string' && content.trim()) return content
  const title = (doc as { title?: unknown }).title
  if (typeof title === 'string' && title.trim()) return title
  return null
}

export function StatementPage() {
  const { statementCid } = useParams<{ statementCid: string }>()
  const navigate = useNavigate()
  const machinery = useMachinery()
  const [statement, setStatement] = useState<Statement | null>(null)
  const [content, setContent] = useState<DisplayableDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!statementCid) return
    try {
      setLoading(true)
      setError(null)
      const result = await getStatementWithContent(machinery, statementCid as IpfsCidV1)
      if (!result) {
        setError('Statement not found')
        setStatement(null)
        setContent(null)
        return
      }
      setStatement(result.statement)
      setContent(result.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statement')
    } finally {
      setLoading(false)
    }
  }, [machinery, statementCid])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !statement) {
    return (
      <Stack spacing={2}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error ?? 'Statement not found'}</Alert>
        {statementCid && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ overflowWrap: 'anywhere' }}
            data-testid="statement-cid"
          >
            Statement CID {statementCid}
          </Typography>
        )}
        <Button component={RouterLink} to="/" sx={{ textTransform: 'none' }}>
          Back to home
        </Button>
      </Stack>
    )
  }

  const body =
    documentText(content)
    ?? statement.excerpt
    ?? statement.title
    ?? 'No content available for this statement.'

  return (
    <Stack spacing={2.5}>
      <Box>
        <Chip size="small" label="Public statement" sx={{ mb: 1 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
          {statement.title?.trim() || 'Statement'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {statement.believerCount} supporters
          {statement.createdAt ? ` · ${new Date(statement.createdAt).toLocaleDateString()}` : ''}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
          {body}
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Your support
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Support is public. It is how a cause shows real people have signed it.
        </Typography>
        <SupportButton
          statementCid={statementCid as IpfsCidV1}
          onSupported={(info) => {
            if (!info.indexed) {
              // Optimistic: tick the visible count before the indexer round-trip.
              // Do not call load() yet — a lagging read would flicker 1 → 0 → 1.
              setStatement((prev) => {
                if (!prev) return prev
                const delta = info.action === 'support' ? 1 : -1
                return {
                  ...prev,
                  believerCount: Math.max(0, (prev.believerCount ?? 0) + delta),
                }
              })
              return
            }
            // Confirmed: reload content, but never paint a regressive believerCount.
            void (async () => {
              if (!statementCid) return
              try {
                const result = await getStatementWithContent(machinery, statementCid as IpfsCidV1)
                if (!result) return
                setStatement((prev) => {
                  const incoming = result.statement.believerCount ?? 0
                  if (!prev) return result.statement
                  if (info.action === 'support' && incoming < prev.believerCount) {
                    return { ...result.statement, believerCount: prev.believerCount }
                  }
                  if (info.action === 'retract' && incoming > prev.believerCount) {
                    return { ...result.statement, believerCount: prev.believerCount }
                  }
                  return result.statement
                })
                setContent(result.content)
              } catch {
                // Keep optimistic count; user can refresh.
              }
            })()
          }}
        />
      </Paper>

      <MonthlyPledgeSignal statementCids={[statementCid as string]} />

      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ overflowWrap: 'anywhere', display: 'block', pt: 1 }}
        data-testid="statement-cid"
      >
        Statement CID {statementCid}
      </Typography>

      <Button
        variant="outlined"
        sx={{ minHeight: 48, borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
        onClick={() => navigate(createCausePath())}
      >
        Start a related cause
      </Button>
    </Stack>
  )
}
