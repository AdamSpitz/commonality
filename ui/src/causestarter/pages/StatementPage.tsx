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
import { useAccount } from 'wagmi'
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
import { useUserStatements } from '../hooks/useUserStatements'
import { useViewCounts } from '../hooks/useViewCounts'
import { createCausePath } from '../lib/causeStore'
import {
  readPersonalFundingBoard,
  writePersonalFundingBoard,
} from '../lib/personalFundingBoard'
import { useMachinery } from '../../shared'

function documentText(doc: DisplayableDocument | null | undefined): string | null {
  if (!doc) return null
  const content = (doc as { content?: unknown }).content
  if (typeof content === 'string' && content.trim()) return content
  const title = (doc as { title?: unknown }).title
  if (typeof title === 'string' && title.trim()) return title
  return null
}

type StatementMode = 'sign' | 'fund' | 'all'

function statementMode(searchParams: URLSearchParams): StatementMode {
  const mode = searchParams.get('mode')
  if (mode === 'sign' || mode === 'fund') return mode
  // Keep old fundable-project links focused instead of silently expanding them.
  if (searchParams.get('section') === 'fundable-projects') return 'fund'
  return 'all'
}

function statementModePath(statementCid: string, mode: StatementMode): string {
  return mode === 'all'
    ? `/statement/${statementCid}`
    : `/statement/${statementCid}?mode=${mode}`
}

export function StatementPage() {
  const { statementCid } = useParams<{ statementCid: string }>()
  const [searchParams] = useSearchParams()
  const mode = statementMode(searchParams)
  const showSigning = mode !== 'fund'
  const showFunding = mode !== 'sign'
  const navigate = useNavigate()
  const { address } = useAccount()
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
  const [addedToFundingBoardOpen, setAddedToFundingBoardOpen] = useState(false)
  const [isInFundingBoard, setIsInFundingBoard] = useState(false)
  const { statements: signedStatements } = useUserStatements()
  const signedCids = signedStatements.map((row) => row.cid)
  const signedCidKey = signedCids.join(',')

  useEffect(() => {
    const board = readPersonalFundingBoard(address)
    const cids = board?.statementCids ?? signedCidKey.split(',').filter(Boolean)
    setIsInFundingBoard(Boolean(statementCid && cids.includes(statementCid)))
  }, [address, statementCid, signedCidKey])

  const addToFundingBoard = () => {
    if (!address || !statementCid) return
    const current = readPersonalFundingBoard(address)
    const seed = current?.statementCids ?? signedCids
    if (seed.includes(statementCid) && current) {
      setIsInFundingBoard(true)
      return
    }
    writePersonalFundingBoard(address, {
      ...current,
      statementCids: [...new Set([...seed, statementCid])],
    })
    setIsInFundingBoard(true)
    setAddedToFundingBoardOpen(true)
  }

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
        // Paint CID fallbacks immediately so the statement page is not held
        // behind operand IPFS reads; fill each body as it arrives.
        setOperandBodies(combinator.operandCids.map((cid) => ({ cid, text: cid })))
        void Promise.all(combinator.operandCids.map(async (cid) => {
          let text = cid
          try {
            const operand = await getStatementWithContent(machinery, cid as IpfsCidV1)
            text = documentText(operand?.content) || cid
          } catch {
            text = cid
          }
          if (cancelled()) return
          setOperandBodies((prev) =>
            prev.map((row) => (row.cid === cid ? { cid, text } : row)),
          )
        }))
      } else {
        setOperandBodies([])
      }
    } catch (err) {
      if (cancelled()) return
      setError(err instanceof Error ? err.message : 'Failed to load statement')
    } finally {
      if (!cancelled()) setLoading(false)
    }
  }, [machinery, setContent, setError, setLoading, setOperandBodies, setStatement, statementCid])

  useEffect(() => {
    if (loading || mode !== 'fund' || searchParams.get('section') !== 'fundable-projects') return
    document.getElementById('fundable-projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, mode, searchParams, statementCid])

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
        {mode !== 'all' && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
            data-testid="statement-mode"
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {mode === 'sign' ? 'Signing view' : 'Funding view'}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Button
                component={RouterLink}
                to={statementModePath(statementCid as string, mode === 'sign' ? 'fund' : 'sign')}
                size="small"
                sx={{ textTransform: 'none' }}
              >
                {mode === 'sign' ? 'Fund work' : 'Sign statement'}
              </Button>
              <Button
                component={RouterLink}
                to={statementModePath(statementCid as string, 'all')}
                size="small"
                color="inherit"
                sx={{ textTransform: 'none' }}
              >
                Full view
              </Button>
            </Stack>
          </Stack>
        )}
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
                    to={statementModePath(operand.cid, mode)}
                    variant="caption"
                    underline="hover"
                  >
                    Open statement
                  </Link>
                </Box>
              ))}
            </Stack>
          )}
          {showSigning && <Stack
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
            {address ? (
              <Button
                size="small"
                variant="outlined"
                disabled={isInFundingBoard}
                onClick={addToFundingBoard}
                sx={{ textTransform: 'none' }}
              >
                {isInFundingBoard ? 'Included in my funding board' : 'Add to my funding board'}
              </Button>
            ) : (
              <Button
                size="small"
                component={RouterLink}
                to="/dashboard"
                sx={{ textTransform: 'none' }}
              >
                Add to my funding board
              </Button>
            )}
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
          </Stack>}
        </Stack>
      </Paper>
      </Box>

      {showFunding && <CauseFundingSummary statementCids={[statementCid as string]} />}

      {showFunding && <CauseBoard
        statementCid={statementCid}
        trustedAlignmentAttesters={trustedAlignmentAttesters}
        embedded
        surfaceTitle="Fundable Projects"
        projectLinks="local"
        projectsHelp={
          <Stack spacing={1}>
            <Typography variant="body2">
              Projects vouched as advancing this statement — not a cause as a whole.
              Do the work? Publish a project and get an alignment vouch; you do not need
              a foundation intro. Only want to judge? Fund proven work, or fund early and
              ask to be reimbursed at cost.
            </Typography>
            <StarterNetworkFilterCopy />
          </Stack>
        }
      />}

      {showFunding && <CauseLeaderboard
        statementCid={statementCid as string}
        embedded
        limit={3}
        fullPageTo={`/statement/${statementCid}/board/leaderboard`}
      />}

      {mode === 'all' && <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Hate this statement’s company on someone else’s cause board? Start your own
          board and reuse this statement — you keep its signers and projects. Write a
          different sentence if this wording is not what you mean; similar claims can
          still count.
        </Typography>
        <Button
          variant="outlined"
          sx={{ minHeight: 48, borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
          onClick={() => navigate(createCausePath())}
        >
          Start a related cause
        </Button>
      </Paper>}

      <Snackbar
        open={cidCopiedOpen}
        autoHideDuration={2500}
        onClose={() => setCidCopiedOpen(false)}
        message="CID copied"
      />
      <Snackbar
        open={addedToFundingBoardOpen}
        autoHideDuration={3500}
        onClose={() => setAddedToFundingBoardOpen(false)}
        message="Added to your funding board. Signing remains unchanged."
      />
    </Stack>
  )
}
