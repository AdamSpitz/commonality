import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Divider, Paper, Stack,
  TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  formatCurrencyTotals,
  projectPathForAddress,
  useTrustedAttesters,
  useTrustedSet,
} from '@ui/shared'
import { getProjectStatus, STATUS_LABELS } from '@ui/lazy-giving'
import { CauseViewStrip, type ViewMode } from '../components/CauseViewStrip'
import { CauseMediatorCard } from '../components/CauseMediatorCard'
import { MediatorEditor } from '../components/MediatorEditor'
import { PlankRow } from '../components/PlankRow'
import { SafetyRejectionDialog } from '../components/SafetyRejectionDialog'
import { ToolCard } from '../components/ToolCard'
import {
  causeTitle, deleteCause, getCause, isLive, markPlankPublished, newPlank,
  publishedPlanks, unpublishedPlanks, updateCause,
  type CauseDraft, type CausePlank, type SafetyState,
} from '../lib/causeStore'
import { atomizeCause, checkSafety, sharpenPlank } from '../lib/causeAssistClient'
import { publishPlank } from '../lib/publishPlank'
import { SUPPORTING_TOOLS } from '../lib/tools'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { useCauseProjects } from '../hooks/useCauseProjects'
import { useViewCounts } from '../hooks/useViewCounts'

function shortAddress(address: string): string {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function safetyState(verdict: {
  allowed: boolean
  category: SafetyState['category']
  explanation: string
}): SafetyState {
  return { ...verdict, checkedAt: new Date().toISOString() }
}

/**
 * A cause is its planks, edited in place.
 *
 * There is no separate authoring mode: a founder adds issues, publishes them
 * one at a time, and adds more later, all on the page his supporters see. That
 * follows from the model rather than from taste — with no single main statement
 * to commit to, there is no moment that a launch step would mark. Promoting a
 * combination into its own signable anchor stays a later, optional move.
 *
 * Causes live in this browser's localStorage, so anyone who can open this page
 * is by definition its founder; editing is unconditional here. Multi-device and
 * visitor-facing cause pages are tracked in TODO.md.
 */
export function CauseDetailPage() {
  const { causeId } = useParams<{ causeId: string }>()
  const navigate = useNavigate()
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const trustedImplicationAttesters = useTrustedAttesters()
  const activeTrustedImplicationAttesters = trustedImplicationAttesters.length > 0
    ? trustedImplicationAttesters
    : undefined
  const {
    trustedSet: trustedAlignmentAttesters,
    isLoading: trustLoading,
    error: trustError,
  } = useTrustedSet(address)
  const trustReady = !address || (
    !trustLoading && !trustError && trustedAlignmentAttesters !== undefined
  )
  const trustUnavailable = Boolean(address)
    && !trustLoading
    && !trustError
    && trustedAlignmentAttesters === undefined

  const [cause, setCause] = useState<CauseDraft | undefined>(() =>
    causeId ? getCause(causeId) : undefined,
  )
  useEffect(() => {
    setCause(causeId ? getCause(causeId) : undefined)
  }, [causeId])

  const [mode, setMode] = useState<ViewMode>('any')
  const [deselectedCids, setDeselectedCids] = useState<Set<string>>(new Set())
  const [seedOpen, setSeedOpen] = useState(false)
  const [seed, setSeed] = useState('')
  const [atomizing, setAtomizing] = useState(false)
  const [sharpeningId, setSharpeningId] = useState<string>()
  const [publishingId, setPublishingId] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [dialogSafety, setDialogSafety] = useState<SafetyState | null>(null)

  useEffect(() => {
    setSeed(cause?.suggestionSeed ?? '')
  }, [cause?.suggestionSeed])

  const patch = useCallback((changes: Partial<CauseDraft>) => {
    if (!causeId) return
    const updated = updateCause(causeId, changes)
    if (updated) setCause(updated)
  }, [causeId])

  const setPlanks = useCallback((planks: CausePlank[]) => patch({ planks }), [patch])
  const storePlankPatch = useCallback((id: string, changes: Partial<CausePlank>) => {
    if (!causeId) return undefined
    const latest = getCause(causeId)
    if (!latest) return undefined
    const updated = updateCause(causeId, {
      planks: latest.planks.map((plank) => (plank.id === id ? { ...plank, ...changes } : plank)),
    })
    if (updated) setCause(updated)
    return updated
  }, [causeId])

  const published = useMemo(() => (cause ? publishedPlanks(cause) : []), [cause])
  const publishedCids = useMemo(
    () => published.map((plank) => plank.cid!).filter(Boolean),
    [published],
  )
  const selectedCids = useMemo(
    () => publishedCids.filter((cid) => !deselectedCids.has(cid)),
    [publishedCids, deselectedCids],
  )

  const {
    counts,
    perPlank,
    loading: countsLoading,
    error: countsError,
    refresh: refreshCounts,
  } = useViewCounts(
    publishedCids,
    selectedCids,
    activeTrustedImplicationAttesters,
    trustReady,
  )
  const {
    projects, totals, countByPlankCid, loading: projectsLoading, error: projectsError,
  } = useCauseProjects(
    publishedCids,
    activeTrustedImplicationAttesters,
    trustedAlignmentAttesters,
    trustReady,
  )

  /**
   * Direct signatures on the least-signed selected plank — the check that keeps
   * band 2 honest as the roster changes (see {@link CauseViewStrip}).
   *
   * `undefined` whenever it cannot be stated exactly: with fewer than two planks
   * there is no combination to qualify, and if any selected plank's counts are
   * missing, a minimum over the rest would report a floor that is too high —
   * hiding the very plank most likely to be the one that failed to load.
   */
  const fewestDirectSignatures = useMemo(() => {
    if (selectedCids.length < 2) return undefined
    let fewest = Number.POSITIVE_INFINITY
    for (const cid of selectedCids) {
      const support = perPlank.get(cid)
      if (!support) return undefined
      fewest = Math.min(fewest, support.direct)
    }
    return fewest
  }, [selectedCids, perPlank])

  const tools = useMemo(
    () => SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate' && t.id !== 'delegation'),
    [],
  )

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

  const drafts = unpublishedPlanks(cause)
  const live = isLive(cause)
  const mutationLocked = Boolean(publishingId || sharpeningId || atomizing)

  const updatePlank = (id: string, changes: Partial<CausePlank>) => {
    if (mutationLocked) return
    storePlankPatch(id, changes)
  }

  const handleAddPlank = () => {
    if (mutationLocked) return
    setPlanks([...cause.planks, newPlank()])
  }

  const handleDeletePlank = (id: string) => {
    if (mutationLocked) return
    setPlanks(cause.planks.filter((plank) => plank.id !== id))
  }

  const handleSuggest = async () => {
    if (mutationLocked) return
    if (seed.trim().length < MIN_SEED_LENGTH) {
      setError('Describe the cause in a sentence or two so suggestions have something to work from.')
      return
    }
    setAtomizing(true)
    setError(null)
    try {
      const result = await atomizeCause({
        description: seed.trim(),
        existingPlanks: cause.planks.map((plank) => plank.text.trim()).filter(Boolean),
        count: 5,
      })
      const incoming: CausePlank[] = result.planks.map((item) => ({
        ...newPlank(item.text, 'suggested'),
        rationale: item.rationale,
      }))
      patch({
        suggestionSeed: seed.trim(),
        // Drop blank rows the founder never filled in, so suggestions don't
        // land under a row of empty boxes.
        planks: [...cause.planks.filter((plank) => plank.text.trim()), ...incoming],
      })
      setSeedOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest issues')
    } finally {
      setAtomizing(false)
    }
  }

  const handleSharpen = async (plank: CausePlank) => {
    if (!plank.text.trim() || mutationLocked) return
    setSharpeningId(plank.id)
    setError(null)
    try {
      const result = await sharpenPlank({
        plank: plank.text.trim(),
        causeDescription: cause.suggestionSeed?.trim() ?? '',
      })
      storePlankPatch(plank.id, {
        text: result.plank,
        rationale: result.rationale,
        // The wording changed, so the old verdict no longer describes it.
        safety: undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sharpen this issue')
    } finally {
      setSharpeningId(undefined)
    }
  }

  const handlePublish = async (plank: CausePlank) => {
    if (publishingId) return
    const text = plank.text.trim()
    if (!text) return
    if (!isConnected || !address || !writeClients) {
      setError('Connect your wallet to publish this issue.')
      return
    }
    setPublishingId(plank.id)
    setError(null)
    try {
      const review = await checkSafety([{ text, fieldLabel: 'Issue' }])
      const verdict = review.results[0]
      if (verdict) {
        storePlankPatch(plank.id, { safety: safetyState(verdict) })
        if (!verdict.allowed) {
          setDialogSafety(safetyState(verdict))
          setError('Blocked text cannot be published. Edit this issue and try again.')
          return
        }
      }
      const cid = await publishPlank({ machinery, writeClients, text })
      const updated = markPlankPublished(cause.id, plank.id, cid, text)
      if (updated) setCause(updated)
      refreshCounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish this issue')
    } finally {
      setPublishingId(undefined)
    }
  }

  const handleDeleteCause = () => {
    if (mutationLocked) return
    if (!window.confirm('Remove this cause from this device? Published statements are unaffected.')) return
    deleteCause(cause.id)
    navigate('/momentum')
  }

  const toggleSelected = (cid: string, selected: boolean) => {
    setDeselectedCids((current) => {
      const next = new Set(current)
      if (selected) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  return (
    <Stack spacing={2.5} data-testid="cause-detail-page">
      <Box>
        {!live && (
          <Chip size="small" label="Nothing published yet" sx={{ mb: 0.75 }} />
        )}
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}
        >
          {causeTitle(cause)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {live
            ? 'People sign each issue separately. The counts below combine those signatures.'
            : 'Write the issues this cause is made of. Publish each one when it is ready.'}
        </Typography>
      </Box>

      {publishedCids.length > 0 && trustLoading && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Loading your trust network before supporter and project counts…
        </Alert>
      )}
      {publishedCids.length > 0 && trustError && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Supporter and project counts are paused because your trust network could not be loaded: {trustError}
        </Alert>
      )}
      {publishedCids.length > 0 && trustUnavailable && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Supporter and project counts are paused until this wallet has trusted attesters.
        </Alert>
      )}

      {publishedCids.length > 0 && trustReady && (
        <>
          <CauseViewStrip
            mode={mode}
            onModeChange={setMode}
            counts={counts}
            selectedCount={selectedCids.length}
            publishedCount={publishedCids.length}
            loading={countsLoading}
            fewestDirectSignatures={fewestDirectSignatures}
          />
          {countsError && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Supporter counts could not be loaded: {countsError}
            </Alert>
          )}
        </>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Issues</Typography>

        {cause.planks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No issues yet. Add one yourself, or describe the cause and let CauseStarter suggest some.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {cause.planks.map((plank, index) => (
            <PlankRow
              key={plank.id}
              plank={plank}
              index={index}
              selected={plank.cid ? !deselectedCids.has(plank.cid) : false}
              onSelectedChange={(selected) => plank.cid && toggleSelected(plank.cid, selected)}
              support={plank.cid ? perPlank.get(plank.cid) : undefined}
              supportLoading={countsLoading}
              projectCount={plank.cid ? countByPlankCid.get(plank.cid) ?? 0 : 0}
              onSupported={() => refreshCounts()}
              onTextChange={(text) => updatePlank(plank.id, { text, safety: undefined })}
              onDelete={() => handleDeletePlank(plank.id)}
              onSharpen={() => void handleSharpen(plank)}
              onPublish={() => void handlePublish(plank)}
              sharpening={sharpeningId === plank.id}
              publishing={publishingId === plank.id}
              mutationLocked={mutationLocked}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddPlank}
            disabled={mutationLocked}
            sx={{ textTransform: 'none' }}
            data-testid="cause-add-plank"
          >
            Add an issue
          </Button>
          <Button
            startIcon={atomizing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={() => setSeedOpen((open) => !open)}
            disabled={mutationLocked}
            sx={{ textTransform: 'none' }}
            data-testid="cause-suggest-planks"
          >
            Suggest issues
          </Button>
        </Stack>

        <Collapse in={seedOpen}>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <TextField
              label="Describe your cause in your own words"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              helperText="Used only to suggest issues. This text is never published and never shown on your cause."
              slotProps={{ htmlInput: { 'data-testid': 'cause-suggestion-seed' } }}
            />
            <Button
              variant="contained"
              onClick={() => void handleSuggest()}
              disabled={mutationLocked}
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              {atomizing ? 'Finding issues…' : 'Suggest issues'}
            </Button>
          </Stack>
        </Collapse>

        {drafts.length > 0 && !isConnected && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Connect a wallet to publish issues. Unpublished issues stay on this device.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Projects</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Projects vouched for as advancing one of this cause's issues. Each is aligned with a
          specific statement, not with the cause as a whole.
        </Typography>

        {publishedCids.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Publish an issue to see projects aligned with it.
          </Alert>
        )}

        {publishedCids.length > 0 && trustReady && projectsLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading aligned projects…</Typography>
          </Stack>
        )}

        {projectsError && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>{projectsError}</Alert>
        )}

        {publishedCids.length > 0 && trustReady && !projectsLoading && !projectsError && projects.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No projects are aligned with these issues yet. Open an issue's board to vouch for work
            that advances it.
          </Typography>
        )}

        {projects.length > 0 && (
          <Stack spacing={1.25}>
            {totals && (
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ pb: 0.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Still needed (open projects)
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatCurrencyTotals(totals.remainingToThreshold)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Unreimbursed (succeeded)
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatCurrencyTotals(totals.totalUnreimbursed)}
                  </Typography>
                </Box>
              </Stack>
            )}
            {projects.map((project) => (
              <Paper
                key={project.projectAddress}
                elevation={0}
                sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                  <Box>
                    <Typography
                      component={RouterLink}
                      to={projectPathForAddress(project.projectAddress)}
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
                      {STATUS_LABELS[getProjectStatus({
                        totalReceived: project.totalReceived || '0',
                        threshold: project.threshold || '0',
                        deadline: project.deadline || '0',
                      })]}
                      {' · aligned with '}
                      {project.viaPlankCids.length === 1
                        ? '1 issue'
                        : `${project.viaPlankCids.length} issues`}
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
            ))}
          </Stack>
        )}
      </Paper>

      {cause.mediator && <CauseMediatorCard mediator={cause.mediator} />}
      <MediatorEditor
        mediator={cause.mediator}
        onChange={(mediator) => {
          if (!mutationLocked) patch({ mediator })
        }}
      />

      {tools.length > 0 && (
        <Stack spacing={1.25}>
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} compact />)}
        </Stack>
      )}

      <Divider />

      <Stack direction="row" spacing={1}>
        <Button
          color="error"
          onClick={handleDeleteCause}
          disabled={mutationLocked}
          sx={{ textTransform: 'none' }}
        >
          Remove locally
        </Button>
      </Stack>

      <SafetyRejectionDialog
        open={Boolean(dialogSafety)}
        fieldLabel="Issue"
        safety={dialogSafety}
        onClose={() => setDialogSafety(null)}
      />
    </Stack>
  )
}

/** Enough text for the atomizer to have something to unbundle. */
const MIN_SEED_LENGTH = 12
