import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { getStatement } from '@commonality/sdk/conceptspace'
import { getAllAlignedProjectsForCause, getTotalFundingForCause } from '@commonality/sdk/fundingportals'
import type { CurrencyAmountBigInt, IpfsCidV1 } from '@commonality/sdk/utils'
import { formatCurrencyTotals, projectPathForAddress } from '@ui/shared'
import { getProjectStatus, STATUS_LABELS } from '@ui/lazy-giving'
import { SupportButton } from '../components/SupportButton'
import { ToolCard } from '../components/ToolCard'
import { CauseMediatorCard } from '../components/CauseMediatorCard'
import {
  adoptedStatements,
  deleteCause,
  getCause,
  type CauseDraft,
} from '../lib/causeStore'
import { SUPPORTING_TOOLS } from '../lib/tools'
import { useMachinery } from '../lib/useMachinery'

type CauseProject = {
  projectAddress: string
  alignmentType: 'direct' | 'indirect'
  totalReceived: string
  threshold: string
  deadline: string
}

function shortAddress(address: string): string {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function projectStatus(project: CauseProject): string {
  return STATUS_LABELS[getProjectStatus({
    totalReceived: project.totalReceived || '0',
    threshold: project.threshold || '0',
    deadline: project.deadline || '0',
  })]
}

function collectStatementCids(cause: CauseDraft): string[] {
  const cids: string[] = []
  if (cause.statementCid) cids.push(cause.statementCid)
  for (const cid of cause.statementCids ?? []) {
    if (cid && !cids.includes(cid)) cids.push(cid)
  }
  return cids
}

function formatSupporters(count: number | undefined, loading: boolean): string {
  if (count !== undefined) {
    return `${count} supporter${count === 1 ? '' : 's'}`
  }
  return loading ? 'Loading supporters…' : 'Supporters unavailable'
}

function formatSupportersShort(count: number | undefined, loading: boolean): string {
  if (count !== undefined) return `${count}`
  return loading ? '…' : '—'
}

export function CauseDetailPage() {
  const { causeId } = useParams<{ causeId: string }>()
  const navigate = useNavigate()
  const machinery = useMachinery()

  // Snapshot localStorage once per causeId so object identity stays stable
  // (getCause() returns a new object every call and was re-triggering fetches).
  const [cause, setCause] = useState<CauseDraft | undefined>(() =>
    causeId ? getCause(causeId) : undefined,
  )

  useEffect(() => {
    setCause(causeId ? getCause(causeId) : undefined)
  }, [causeId])

  // Always surface every growth surface on the cause page (no lever checklist).
  const tools = useMemo(
    () => SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate' && t.id !== 'delegation'),
    [],
  )
  const adopted = useMemo(
    () => (cause ? adoptedStatements(cause) : []),
    [cause],
  )

  const statementCids = useMemo(
    () => (cause ? collectStatementCids(cause) : []),
    [cause],
  )
  // Primitive key so effect deps stay stable even if array identity changes.
  const statementCidsKey = statementCids.join('\0')

  const [supportByCid, setSupportByCid] = useState<Record<string, number>>({})
  const [supportLoading, setSupportLoading] = useState(false)
  const [projects, setProjects] = useState<CauseProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [remainingToThreshold, setRemainingToThreshold] = useState<CurrencyAmountBigInt[]>([])
  const [totalUnreimbursed, setTotalUnreimbursed] = useState<CurrencyAmountBigInt[]>([])
  // Drop stale in-flight count fetches (support then quick retract, etc.).
  const supportLoadGenRef = useRef(0)
  // Holds the pre/post optimistic count so confirm fetches cannot paint a regression
  // (the classic 0 → 1 → 0 → 1 flicker while the indexer lags).
  const pendingSupportRef = useRef<{
    cid: string
    action: 'support' | 'retract'
    baseline: number
    optimistic: number
  } | null>(null)

  const fetchSupportCounts = useCallback(async (): Promise<Record<string, number>> => {
    const cids = statementCidsKey ? statementCidsKey.split('\0').filter(Boolean) : []
    const next: Record<string, number> = {}
    await Promise.all(
      cids.map(async (cid) => {
        try {
          const statement = await getStatement(machinery, cid as IpfsCidV1)
          // Missing indexer row / no events yet → 0 supporters, not an error.
          next[cid] = statement?.believerCount ?? 0
        } catch {
          // Leave out of `next` so we keep any previous successful value.
        }
      }),
    )
    return next
  }, [machinery, statementCidsKey])

  const loadSupportCounts = useCallback(async (options?: { isCancelled?: () => boolean }) => {
    const gen = ++supportLoadGenRef.current
    const isStale = () =>
      gen !== supportLoadGenRef.current || (options?.isCancelled?.() ?? false)
    const cids = statementCidsKey ? statementCidsKey.split('\0').filter(Boolean) : []
    if (cids.length === 0) {
      if (!isStale()) {
        setSupportByCid({})
        setSupportLoading(false)
      }
      return
    }

    if (!isStale()) setSupportLoading(true)
    const next = await fetchSupportCounts()
    if (isStale()) return
    // Don't clobber an in-flight optimistic chip with a lagging indexer read.
    const pending = pendingSupportRef.current
    if (pending && next[pending.cid] !== undefined) {
      const counted = next[pending.cid]!
      const regresses =
        (pending.action === 'support' && counted < pending.optimistic)
        || (pending.action === 'retract' && counted > pending.optimistic)
      if (regresses) {
        if (!isStale()) setSupportLoading(false)
        return
      }
      pendingSupportRef.current = null
    }
    setSupportByCid((prev) => ({ ...prev, ...next }))
    setSupportLoading(false)
  }, [fetchSupportCounts, statementCidsKey])

  /**
   * After support/retract: optimistically nudge the chip once, then poll the event
   * cache until it confirms — without ever painting a lagging intermediate value.
   */
  const handleSupportSettled = useCallback((info?: {
    action?: 'support' | 'retract'
    indexed?: boolean
  }) => {
    const cid = cause?.statementCid
    if (!cid) return

    const action = info?.action

    // Phase 1: optimistic paint only (do not start fetching yet).
    if (info?.indexed === false && action) {
      setSupportByCid((prev) => {
        const baseline = prev[cid] ?? 0
        const optimistic =
          action === 'support'
            ? baseline + 1
            : Math.max(0, baseline - 1)
        pendingSupportRef.current = { cid, action, baseline, optimistic }
        return { ...prev, [cid]: optimistic }
      })
      return
    }

    // Phase 2 (indexed / legacy): poll until the cache matches the optimistic
    // direction. Never apply a fetch that would roll the chip backwards.
    const pending = pendingSupportRef.current?.cid === cid
      ? pendingSupportRef.current
      : null
    const effectiveAction = action ?? pending?.action
    const baseline = pending?.baseline
    const optimistic = pending?.optimistic

    const gen = ++supportLoadGenRef.current
    const delaysMs = [0, 100, 200, 400, 800, 1200, 2000]
    void (async () => {
      let lastNext: Record<string, number> | null = null
      for (let i = 0; i < delaysMs.length; i++) {
        if (gen !== supportLoadGenRef.current) return
        const delay = delaysMs[i]!
        if (delay > 0) await new Promise((r) => setTimeout(r, delay))
        if (gen !== supportLoadGenRef.current) return
        const next = await fetchSupportCounts()
        if (gen !== supportLoadGenRef.current) return
        lastNext = next

        const counted = next[cid]
        if (counted === undefined) continue

        const confirmed =
          effectiveAction === 'support'
            ? (baseline !== undefined ? counted > baseline : counted >= (optimistic ?? 1))
            : effectiveAction === 'retract'
              ? (baseline !== undefined ? counted < baseline : counted === 0)
              : true

        if (!confirmed) continue

        if (pendingSupportRef.current?.cid === cid) pendingSupportRef.current = null
        setSupportByCid((prev) => ({ ...prev, ...next }))
        setSupportLoading(false)
        return
      }

      // Exhausted retries: only commit if we would not regress the optimistic chip.
      if (gen !== supportLoadGenRef.current || !lastNext) return
      const counted = lastNext[cid]
      if (
        counted !== undefined
        && optimistic !== undefined
        && (
          (effectiveAction === 'support' && counted < optimistic)
          || (effectiveAction === 'retract' && counted > optimistic)
        )
      ) {
        // Keep optimistic value; leave pending so a later load can still heal.
        setSupportLoading(false)
        return
      }
      if (pendingSupportRef.current?.cid === cid) pendingSupportRef.current = null
      setSupportByCid((prev) => ({ ...prev, ...lastNext }))
      setSupportLoading(false)
    })()
  }, [cause?.statementCid, fetchSupportCounts])

  useEffect(() => {
    let cancelled = false
    void loadSupportCounts({ isCancelled: () => cancelled })
    return () => {
      cancelled = true
    }
  }, [loadSupportCounts])

  useEffect(() => {
    let cancelled = false
    const goalCid = cause?.statementCid

    const run = async () => {
      if (!goalCid) {
        if (!cancelled) {
          setProjects([])
          setRemainingToThreshold([])
          setTotalUnreimbursed([])
          setProjectsError(null)
          setProjectsLoading(false)
        }
        return
      }

      if (!cancelled) {
        setProjectsLoading(true)
        setProjectsError(null)
      }
      try {
        const [aligned, fundingMetrics] = await Promise.all([
          getAllAlignedProjectsForCause(machinery, goalCid as IpfsCidV1),
          getTotalFundingForCause(machinery, goalCid as IpfsCidV1),
        ])
        if (!cancelled) {
          setProjects(aligned)
          setRemainingToThreshold(fundingMetrics.remainingToThreshold)
          setTotalUnreimbursed(fundingMetrics.totalUnreimbursed)
        }
      } catch (err) {
        if (!cancelled) {
          setProjects([])
          setRemainingToThreshold([])
          setTotalUnreimbursed([])
          setProjectsError(err instanceof Error ? err.message : 'Failed to load projects')
        }
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [cause?.statementCid, machinery])

  if (!cause) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Cause not found on this device.
        </Alert>
        <Button component={RouterLink} to="/momentum" sx={{ textTransform: 'none' }}>
          Back to momentum
        </Button>
      </Stack>
    )
  }

  const handleDelete = () => {
    if (!window.confirm('Remove this cause from this device? On-chain data is unaffected.')) return
    deleteCause(cause.id)
    navigate('/momentum')
  }

  const goalSupport = cause.statementCid ? supportByCid[cause.statementCid] : undefined

  return (
    <Stack spacing={2.5}>
      <Box>
        {cause.status !== 'launched' && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Chip size="small" label="Not yet launched" color="default" />
          </Stack>
        )}
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          {cause.name || 'Untitled cause'}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Goal
          </Typography>
          {cause.statementCid && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={formatSupporters(goalSupport, supportLoading)}
            />
          )}
        </Stack>
        <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
          {cause.goal || 'No goal yet.'}
        </Typography>
        {cause.statementCid ? (
          <Box sx={{ mt: 2 }}>
            <Button
              component={RouterLink}
              to={`/statement/${cause.statementCid}`}
              size="small"
              sx={{ textTransform: 'none', mb: 2 }}
            >
              View published goal
            </Button>
            <SupportButton
              statementCid={cause.statementCid as IpfsCidV1}
              onSupported={handleSupportSettled}
            />
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Still a draft. Publish so others can stand with you.
            <Button
              component={RouterLink}
              to={`/start?id=${cause.id}`}
              size="small"
              sx={{ display: 'block', mt: 1, textTransform: 'none' }}
            >
              Continue setup
            </Button>
          </Alert>
        )}
      </Paper>

      {adopted.length > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Supporting statements
          </Typography>
          <Stack spacing={1.25}>
            {(() => {
              // Launch stores extras only: adopted statements whose text !== goal
              // (see StartCausePage publish loop). Zip by that same filter so a
              // goal-duplicate adopted statement does not shift later CID slots.
              const goalText = (cause.goal || '').trim()
              let extraIdx = 0
              return adopted.map((s) => {
                const isGoalDuplicate = s.text.trim() === goalText
                const cid = isGoalDuplicate
                  ? cause.statementCid
                  : cause.statementCids?.[extraIdx++]
                const count = cid ? supportByCid[cid] : undefined
                return (
                  <Box key={s.id}>
                    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {s.text}
                      </Typography>
                      {cid && (
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label={formatSupportersShort(count, supportLoading)}
                          sx={{ minWidth: 40 }}
                        />
                      )}
                    </Stack>
                    {cid && (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatSupporters(count, supportLoading)}
                        </Typography>
                        <Button
                          component={RouterLink}
                          to={`/statement/${cid}`}
                          size="small"
                          sx={{ textTransform: 'none' }}
                        >
                          View
                        </Button>
                      </Stack>
                    )}
                  </Box>
                )
              })
            })()}
          </Stack>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 1.25 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Projects
          </Typography>
          {cause.statementCid && (
            <Button
              component={RouterLink}
              to={`/cause/${cause.id}/board`}
              size="small"
              variant="contained"
              sx={{ textTransform: 'none' }}
            >
              Cause board
            </Button>
          )}
        </Stack>

        {!cause.statementCid && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Publish the cause goal to see projects aligned with it.
          </Alert>
        )}

        {cause.statementCid && projectsLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Loading projects for this cause…
            </Typography>
          </Stack>
        )}

        {cause.statementCid && projectsError && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {projectsError}
          </Alert>
        )}

        {cause.statementCid && !projectsLoading && !projectsError && projects.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No projects are aligned with this cause yet. Open the{' '}
            <Button
              component={RouterLink}
              to={`/cause/${cause.id}/board`}
              size="small"
              sx={{ textTransform: 'none', p: 0, minWidth: 0, verticalAlign: 'baseline' }}
            >
              cause board
            </Button>{' '}
            to vouch for work that advances the goal.
          </Typography>
        )}

        {projects.length > 0 && (
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ pb: 0.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Still needed (open projects)
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatCurrencyTotals(remainingToThreshold)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Unreimbursed (succeeded)
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatCurrencyTotals(totalUnreimbursed)}
                </Typography>
              </Box>
            </Stack>
            {projects.map((project) => {
              const projectPath = projectPathForAddress(project.projectAddress)
              return (
                <Paper
                  key={project.projectAddress}
                  elevation={0}
                  sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <Box>
                      <Typography
                        component={RouterLink}
                        to={projectPath}
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        Project {shortAddress(project.projectAddress)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {projectStatus(project)}
                        {' · '}
                        {project.alignmentType === 'direct' ? 'Directly aligned' : 'Indirectly aligned'}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={project.alignmentType}
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Paper>

      {cause.mediator && <CauseMediatorCard mediator={cause.mediator} />}

      {tools.length > 0 && (
        <Stack spacing={1.25}>
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} compact />
          ))}
        </Stack>
      )}

      <Divider />

      <Stack direction="row" spacing={1}>
        <Button
          component={RouterLink}
          to={`/start?id=${cause.id}`}
          variant="outlined"
          sx={{ textTransform: 'none', borderRadius: 999 }}
        >
          Edit
        </Button>
        <Button color="error" onClick={handleDelete} sx={{ textTransform: 'none' }}>
          Remove locally
        </Button>
      </Stack>
    </Stack>
  )
}

