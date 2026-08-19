import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getStatementWithContent, type Statement } from '@commonality/sdk/conceptspace'
import {
  parseCombinatorStatement,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useTrustedAttesters } from '@ui/shared'
import { CauseBoard, CauseLeaderboard } from '@ui/fundingportals'
import { useAlignmentTrust } from '../hooks/useAlignmentTrust'
import { SupportButton } from '../components/SupportButton'
import { CauseFundingSummary } from '../components/CauseFundingSummary'
import { StarterNetworkFilterCopy } from '../components/StarterNetworkFilterNotice'
import { useViewCounts } from '../hooks/useViewCounts'
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const machinery = useMachinery()
  const trustedImplicationAttesters = useTrustedAttesters()
  const { trustedAlignmentAttesters } = useAlignmentTrust()
  const activeTrustedImplicationAttesters = trustedImplicationAttesters.length > 0
    ? trustedImplicationAttesters
    : undefined
  const statementCids = statementCid ? [statementCid] : []
  const {
    perPlank,
    loading: countsLoading,
    refresh: refreshCounts,
  } = useViewCounts(
    statementCids,
    statementCids,
    activeTrustedImplicationAttesters,
    Boolean(statementCid),
  )
  const [statement, setStatement] = useState<Statement | null>(null)
  const [content, setContent] = useState<DisplayableDocument | null>(null)
  const [operandBodies, setOperandBodies] = useState<Array<{ cid: string; text: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cidCopiedOpen, setCidCopiedOpen] = useState(false)

  // Operand reads outlive a navigation, so every write past an await is guarded:
  // a late resolve must not paint one statement's operands onto another.
  const load = useCallback(async (cancelled: () => boolean) => {
    if (!statementCid) return
    try {
      setLoading(true)
      setError(null)
      const result = await getStatementWithContent(machinery, statementCid as IpfsCidV1)
      if (cancelled()) return
      if (!result) {
        setError('Statement not found')
        setStatement(null)
        setContent(null)
        setOperandBodies([])
        return
      }
      setStatement(result.statement)
      setContent(result.content)
      const combinator = result.content ? parseCombinatorStatement(result.content) : null
      if (combinator) {
        const operands = await Promise.all(combinator.operandCids.map(async (cid) => {
          try {
            const operand = await getStatementWithContent(machinery, cid as IpfsCidV1)
            return { cid, text: documentText(operand?.content) || cid }
          } catch {
            return { cid, text: cid }
          }
        }))
        if (cancelled()) return
        setOperandBodies(operands)
      } else {
        setOperandBodies([])
      }
    } catch (err) {
      if (cancelled()) return
      setError(err instanceof Error ? err.message : 'Failed to load statement')
    } finally {
      if (!cancelled()) setLoading(false)
    }
  }, [machinery, statementCid])

  useEffect(() => {
    if (loading || searchParams.get('section') !== 'fundable-projects') return
    document.getElementById('fundable-projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, searchParams, statementCid])

  useEffect(() => {
    let cancelled = false
    void load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [load])

  // Soft revalidation must not unmount CauseBoard (project-list spinner flash).
  if (loading && !statement) {
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
          <Link
            component="button"
            type="button"
            variant="caption"
            underline="hover"
            data-testid="statement-cid"
            onClick={() => {
              void navigator.clipboard.writeText(statementCid).then(() => {
                setCidCopiedOpen(true)
              })
            }}
          >
            Copy CID
          </Link>
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
  const title = statement.title?.trim()
  const showTitle = Boolean(
    title
    && title !== 'Statement'
    && !body.trim().startsWith(title),
  )
  const support = statementCid ? perPlank.get(statementCid) : undefined
  const supportCaption = support
    ? `${support.total.toLocaleString()} · ${support.direct} direct · ${support.indirect} indirect`
    : countsLoading
      ? 'Counting signers…'
      : 'Signers unavailable'
  const combinator = content ? parseCombinatorStatement(content) : null
  const createdLabel = statement.createdAt
    ? ` · ${new Date(statement.createdAt).toLocaleDateString()}`
    : ''

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main', display: 'block' }}
        >
          Statement
        </Typography>
      <Paper
        variant="outlined"
        sx={{ p: 1.25, borderRadius: 2 }}
        data-testid="statement-header"
      >
        <Stack spacing={0.75}>
          {showTitle && (
            <Typography variant="subtitle2" component="h1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          )}
          {combinator && (
            <Typography
              variant="overline"
              sx={{ letterSpacing: '0.12em', fontWeight: 700, color: 'text.secondary', display: 'block' }}
              data-testid="combinator-kind"
            >
              {combinator.combinator === 'all' ? 'All of these statements' : 'Any of these statements'}
            </Typography>
          )}
          <Typography
            variant="body2"
            component={showTitle ? 'p' : 'h1'}
            sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}
          >
            {body}
          </Typography>
          {combinator && operandBodies.length > 0 && (
            <Stack spacing={1} sx={{ pt: 1 }} data-testid="combinator-operands">
              {operandBodies.map((operand) => (
                <Box key={operand.cid}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {operand.text}
                  </Typography>
                  <Link
                    component={RouterLink}
                    to={`/statement/${operand.cid}`}
                    variant="caption"
                    underline="hover"
                  >
                    Open statement
                  </Link>
                </Box>
              ))}
            </Stack>
          )}
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <SupportButton
              statementCid={statementCid as IpfsCidV1}
              subject="statement"
              label="Sign"
              compact
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
            refreshCounts()
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
            <Typography variant="caption" color="text.secondary">
              {supportCaption}{createdLabel}
              {statementCid && (
                <>
                  {' · '}
                  <Link
                    component="button"
                    type="button"
                    variant="caption"
                    underline="hover"
                    data-testid="statement-cid"
                    sx={{
                      display: 'inline',
                      verticalAlign: 'baseline',
                      p: 0,
                      border: 0,
                      background: 'none',
                      font: 'inherit',
                      lineHeight: 'inherit',
                      color: 'inherit',
                    }}
                    onClick={() => {
                      void navigator.clipboard.writeText(statementCid).then(() => {
                        setCidCopiedOpen(true)
                      })
                    }}
                  >
                    Copy CID
                  </Link>
                </>
              )}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
      </Box>

      <CauseFundingSummary statementCids={[statementCid as string]} />

      <CauseBoard
        statementCid={statementCid}
        trustedAlignmentAttesters={trustedAlignmentAttesters}
        embedded
        surfaceTitle="Fundable Projects"
        projectLinks="local"
        projectsHelp={
          <Stack spacing={1}>
            <Typography variant="body2">
              Projects vouched for as advancing this statement. Each is aligned with this
              statement, not with a cause as a whole.
            </Typography>
            <StarterNetworkFilterCopy />
          </Stack>
        }
      />

      <CauseLeaderboard
        statementCid={statementCid as string}
        embedded
        limit={3}
        fullPageTo={`/statement/${statementCid}/board/leaderboard`}
      />

      <Button
        variant="outlined"
        sx={{ minHeight: 48, borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
        onClick={() => navigate(createCausePath())}
      >
        Start a related cause
      </Button>

      <Snackbar
        open={cidCopiedOpen}
        autoHideDuration={2500}
        onClose={() => setCidCopiedOpen(false)}
        message="CID copied"
      />
    </Stack>
  )
}
