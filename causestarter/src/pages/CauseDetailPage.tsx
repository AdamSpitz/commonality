import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { DelegatableNotesSection } from '@ui/fundingportals'
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

  const loadSupportCounts = useCallback(async (options?: { isCancelled?: () => boolean }) => {
    const isCancelled = options?.isCancelled ?? (() => false)
    const cids = statementCidsKey ? statementCidsKey.split('\0').filter(Boolean) : []
    if (cids.length === 0) {
      if (!isCancelled()) {
        setSupportByCid({})
        setSupportLoading(false)
      }
      return
    }

    if (!isCancelled()) setSupportLoading(true)
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
    if (isCancelled()) return
    setSupportByCid((prev) => ({ ...prev, ...next }))
    setSupportLoading(false)
  }, [machinery, statementCidsKey])

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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
          <Chip
            size="small"
            label={cause.status === 'launched' ? 'Launched' : 'Draft'}
            color={cause.status === 'launched' ? 'success' : 'default'}
          />
        </Stack>
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
              onSupported={() => void loadSupportCounts()}
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

      {cause.statementCid ? (
        <DelegatableNotesSection
          statementCid={cause.statementCid}
          to={`/cause/${cause.id}/earmarked`}
        />
      ) : (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Earmarked funds
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            After you publish, this shows how much is pledged to the cause, how much you have
            pledged, and how much others have directed to you.
          </Typography>
        </Paper>
      )}

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
