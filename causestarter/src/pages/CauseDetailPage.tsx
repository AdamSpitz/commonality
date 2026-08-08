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
import { getAllAlignedProjectsForCause } from '@commonality/sdk/fundingportals'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { projectPathForAddress } from '@ui/shared'
import { SupportButton } from '../components/SupportButton'
import { ToolCard } from '../components/ToolCard'
import {
  adoptedStatements,
  deleteCause,
  getCause,
  type CauseDraft,
} from '../lib/causeStore'
import { toolsForLevers } from '../lib/tools'
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
  const raised = BigInt(project.totalReceived || '0')
  const goal = BigInt(project.threshold || '0')
  if (raised > 0n && goal > 0n && raised >= goal) return 'Funded'
  if (raised > 0n) return 'Has contributions'
  return 'Open campaign'
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

  const tools = useMemo(
    () => (cause ? toolsForLevers(cause.levers) : []),
    [cause],
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

  const loadSupportCounts = useCallback(async () => {
    const cids = statementCidsKey ? statementCidsKey.split('\0').filter(Boolean) : []
    if (cids.length === 0) {
      setSupportByCid({})
      setSupportLoading(false)
      return
    }

    setSupportLoading(true)
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
    setSupportByCid((prev) => ({ ...prev, ...next }))
    setSupportLoading(false)
  }, [machinery, statementCidsKey])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const cids = statementCidsKey ? statementCidsKey.split('\0').filter(Boolean) : []
      if (cids.length === 0) {
        if (!cancelled) {
          setSupportByCid({})
          setSupportLoading(false)
        }
        return
      }

      if (!cancelled) setSupportLoading(true)
      const next: Record<string, number> = {}
      await Promise.all(
        cids.map(async (cid) => {
          try {
            const statement = await getStatement(machinery, cid as IpfsCidV1)
            next[cid] = statement?.believerCount ?? 0
          } catch {
            // preserve previous values for this cid
          }
        }),
      )
      if (cancelled) return
      setSupportByCid((prev) => ({ ...prev, ...next }))
      setSupportLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [machinery, statementCidsKey])

  useEffect(() => {
    let cancelled = false
    const goalCid = cause?.statementCid

    const run = async () => {
      if (!goalCid) {
        if (!cancelled) {
          setProjects([])
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
        const aligned = await getAllAlignedProjectsForCause(machinery, goalCid as IpfsCidV1)
        if (!cancelled) setProjects(aligned)
      } catch (err) {
        if (!cancelled) {
          setProjects([])
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
            {adopted.map((s, index) => {
              const cid = cause.statementCids?.[index]
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
            })}
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

      {tools.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Tools for this cause
          </Typography>
          <Stack spacing={1.25}>
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} compact />
            ))}
          </Stack>
        </Box>
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
