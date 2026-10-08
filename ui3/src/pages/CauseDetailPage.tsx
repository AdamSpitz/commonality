import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Link as MuiLink } from '@mui/material'
import { StatementRow } from '../components/StatementRow'
import { PublishAllPanel } from '../components/PublishAllPanel'
import { CauseHistory } from '../components/ChangeHistory'
import { ReorderableList } from '../components/ReorderableList'
import {
  addBelief,
  addFounder,
  addMeasureToMilestone,
  addMilestone,
  addProjectLink,
  addProjectSupporter,
  addProjectVolunteer,
  canMoveBelief,
  causeLocalShareUrl,
  causePortableShareUrl,
  claimFounder,
  commitBeliefEdit,
  commitGoalEdit,
  copyTextToClipboard,
  deleteCause,
  downloadCauseExport,
  draftStatements,
  getAggregateTitle,
  getCause,
  markBeliefPublished,
  markGoalPublished,
  moveBelief,
  publishedStatements,
  removeBelief,
  removeFounder,
  removeMeasureFromMilestone,
  removeMilestone,
  removeProjectLink,
  removeProjectSupporter,
  removeProjectVolunteer,
  reorderBeliefSiblings,
  reorderMilestones,
  restoreBeliefVersion,
  restoreGoalVersion,
  rootBeliefs,
  sortedTimeline,
  supportingBeliefs,
  updateCauseMeta,
  updateMilestone,
  updateMilestoneMeasure,
  updateProject,
  type MeasureKind,
  type MeasureStatus,
  type MilestoneStatus,
  type ProjectStatus,
} from '../lib/causeModel'
import { checkBeliefsSupportGoal, suggestBeliefs } from '../lib/causeAssistClient'
import { getDomainUrl } from '../lib/domainUrls'
import { memberLabel, normalizeUsername, validateUsername } from '../lib/memberIdentity'
import { useSession } from '../lib/session'

export function CauseDetailPage() {
  const { causeId } = useParams<{ causeId: string }>()
  const navigate = useNavigate()
  const { address } = useAccount()
  const { user, isLoggedIn } = useSession()
  const actor = user?.username
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  void tick
  const record = causeId ? getCause(causeId) : null

  const [titleDraft, setTitleDraft] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [founderDraft, setFounderDraft] = useState('')
  const [beliefDraft, setBeliefDraft] = useState('')
  const [beliefRationale, setBeliefRationale] = useState('')
  const [parentBeliefId, setParentBeliefId] = useState('')
  const [msTitle, setMsTitle] = useState('')
  const [msDate, setMsDate] = useState('')
  const [measureTexts, setMeasureTexts] = useState<Record<string, string>>({})
  const [measureKinds, setMeasureKinds] = useState<Record<string, MeasureKind>>({})
  const [projectTitle, setProjectTitle] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [projectFunding, setProjectFunding] = useState('')
  const [volRole, setVolRole] = useState<Record<string, string>>({})
  const [assistMsg, setAssistMsg] = useState<string | null>(null)
  const [assistBusy, setAssistBusy] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!causeId || !actor) return
    const current = getCause(causeId)
    if (current && current.founders.length === 0) {
      claimFounder(causeId, actor)
      refresh()
    }
  }, [actor, causeId])

  useEffect(() => {
    if (!record) return
    setTitleDraft(record.title)
    setSummaryDraft(record.summary)
  }, [record?.id, record?.title, record?.summary, record?.updatedAt])

  if (!record) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Cause not found</Typography>
        <Typography variant="body2" color="text.secondary">
          This cause is not on this device. Import a JSON/share link, or launch a new cause.
        </Typography>
        <Button component={RouterLink} to="/causes" sx={{ textTransform: 'none' }}>Back to causes</Button>
      </Stack>
    )
  }

  const commitMeta = () => {
    updateCauseMeta(record.id, { title: titleDraft, summary: summaryDraft }, actor)
    refresh()
  }

  const timeline = sortedTimeline(record)
  const roots = rootBeliefs(record)
  const drafts = draftStatements(record)
  const published = publishedStatements(record)

  return (
    <Stack spacing={3} data-testid="cause-detail-page">
      {/* Header */}
      <Stack spacing={1}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
          Cause
        </Typography>
        <TextField
          fullWidth
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitMeta}
          variant="standard"
          placeholder="Cause title"
          inputProps={{ style: { fontWeight: 800, fontSize: '1.5rem' }, 'data-testid': 'cause-title' }}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          onBlur={commitMeta}
          placeholder="Optional short summary"
          size="small"
        />
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`${record.founders.length} founders`} />
          <Chip size="small" label={`${record.beliefs.length} beliefs`} variant="outlined" />
          <Chip size="small" label={`${timeline.length} milestones`} variant="outlined" />
          <Chip size="small" label={`${record.projects.length} projects`} variant="outlined" />
          <Chip size="small" label={`${published.length} published`} color="success" variant="outlined" />
          <Chip size="small" label={`${drafts.length} drafts`} variant="outlined" />
        </Stack>
        <ShareRow
          causeId={record.id}
          shareMsg={shareMsg}
          setShareMsg={setShareMsg}
          onExported={refresh}
        />
      </Stack>

      <PublishAllPanel cause={record} onProgress={refresh} />

      {/* Founders */}
      <Section title="Founders" subtitle="Members who own and shape this cause — referenced by username, not wallet.">
        <Stack spacing={1}>
          {record.founders.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No founders yet. Log in, then claim this cause.
            </Typography>
          )}
          {record.founders.map((f) => (
            <Stack key={f} direction="row" justifyContent="space-between" alignItems="center">
              <MuiLink
                component={RouterLink}
                to={`/member/${normalizeUsername(f)}`}
                underline="hover"
                variant="body2"
                sx={{ fontWeight: 600 }}
              >
                {memberLabel(f)}
              </MuiLink>
              <Button
                size="small"
                color="error"
                variant="text"
                sx={{ textTransform: 'none' }}
                onClick={() => {
                  removeFounder(record.id, f, actor)
                  refresh()
                }}
              >
                Remove
              </Button>
            </Stack>
          ))}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              value={founderDraft}
              onChange={(e) => setFounderDraft(e.target.value)}
              placeholder="username (e.g. river_sam)"
              inputProps={{ autoCapitalize: 'none' }}
            />
            <Button
              variant="outlined"
              sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
              onClick={() => {
                const err = validateUsername(founderDraft)
                if (err) {
                  window.alert(err)
                  return
                }
                addFounder(record.id, normalizeUsername(founderDraft), actor)
                setFounderDraft('')
                refresh()
              }}
            >
              Add founder
            </Button>
            {isLoggedIn && actor && (
              <Button
                variant="text"
                sx={{ textTransform: 'none', fontWeight: 600 }}
                onClick={() => {
                  if (actor) claimFounder(record.id, actor)
                  refresh()
                }}
              >
                Me (@{actor})
              </Button>
            )}
          </Stack>
        </Stack>
      </Section>

      {/* Goal */}
      <Section title="Goal" subtitle="The change this cause wants in the world. Supporters stand by this statement.">
        <StatementRow
          statement={record.goal}
          roleLabel="Goal"
          causeDescription={record.summary || record.title}
          onCommitEdit={(input) => {
            commitGoalEdit(record.id, { ...input, author: actor })
            if (actor) claimFounder(record.id, actor)
            refresh()
          }}
          onPublished={(cid) => {
            markGoalPublished(record.id, cid, actor)
            if (actor) claimFounder(record.id, actor)
            refresh()
          }}
          onRestoreVersion={(versionId) => {
            restoreGoalVersion(record.id, versionId, actor)
            refresh()
          }}
        />
      </Section>

      {/* Beliefs */}
      <Section
        title="Beliefs"
        subtitle="Founder beliefs that motivate the goal. Supporters can stand by these too. Drag ⋮⋮ to reorder."
      >
        <ReorderableList
          itemIds={roots.map((b) => b.id)}
          onReorder={(ids) => {
            reorderBeliefSiblings(record.id, null, ids, actor)
            refresh()
          }}
        >
          {(beliefId, dragHandleProps) => {
            const belief = record.beliefs.find((b) => b.id === beliefId)
            if (!belief) return null
            const children = supportingBeliefs(record, belief.id)
            return (
              <Box>
                <StatementRow
                  statement={belief}
                  roleLabel="Belief"
                  supportingNote={belief.rationale}
                  causeDescription={record.summary || record.title}
                  dragHandleProps={dragHandleProps}
                  onCommitEdit={(input) => {
                    commitBeliefEdit(record.id, belief.id, { ...input, author: actor })
                    refresh()
                  }}
                  onPublished={(cid) => {
                    markBeliefPublished(record.id, belief.id, cid, actor)
                    refresh()
                  }}
                  onRestoreVersion={(versionId) => {
                    restoreBeliefVersion(record.id, belief.id, versionId, actor)
                    refresh()
                  }}
                  onDelete={() => {
                    removeBelief(record.id, belief.id, actor)
                    refresh()
                  }}
                  onMoveUp={() => {
                    moveBelief(record.id, belief.id, 'up', actor)
                    refresh()
                  }}
                  onMoveDown={() => {
                    moveBelief(record.id, belief.id, 'down', actor)
                    refresh()
                  }}
                  canMoveUp={canMoveBelief(record, belief.id, 'up')}
                  canMoveDown={canMoveBelief(record, belief.id, 'down')}
                />
                {children.length > 0 && (
                  <Box sx={{ mt: 1, ml: { xs: 1, sm: 2 } }}>
                    <ReorderableList
                      itemIds={children.map((c) => c.id)}
                      onReorder={(ids) => {
                        reorderBeliefSiblings(record.id, belief.id, ids, actor)
                        refresh()
                      }}
                    >
                      {(childId, childDrag) => {
                        const child = children.find((c) => c.id === childId)
                        if (!child) return null
                        return (
                          <StatementRow
                            statement={child}
                            roleLabel="Supporting belief"
                            dragHandleProps={childDrag}
                            causeDescription={record.summary || record.title}
                            onCommitEdit={(input) => {
                              commitBeliefEdit(record.id, child.id, { ...input, author: actor })
                              refresh()
                            }}
                            onPublished={(cid) => {
                              markBeliefPublished(record.id, child.id, cid, actor)
                              refresh()
                            }}
                            onRestoreVersion={(versionId) => {
                              restoreBeliefVersion(record.id, child.id, versionId, actor)
                              refresh()
                            }}
                            onDelete={() => {
                              removeBelief(record.id, child.id, actor)
                              refresh()
                            }}
                          />
                        )
                      }}
                    </ReorderableList>
                  </Box>
                )}
              </Box>
            )
          }}
        </ReorderableList>

        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            value={beliefDraft}
            onChange={(e) => setBeliefDraft(e.target.value)}
            placeholder="Belief that motivates the goal"
            inputProps={{ 'data-testid': 'belief-draft' }}
          />
          <TextField
            fullWidth
            size="small"
            value={beliefRationale}
            onChange={(e) => setBeliefRationale(e.target.value)}
            placeholder="Why it motivates (optional)"
          />
          {record.beliefs.length > 0 && (
            <TextField
              select
              fullWidth
              size="small"
              label="Supports belief (optional nesting)"
              value={parentBeliefId}
              onChange={(e) => setParentBeliefId(e.target.value)}
            >
              <MenuItem value="">— top-level —</MenuItem>
              {record.beliefs.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.text.slice(0, 60) || b.id}</MenuItem>
              ))}
            </TextField>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
              onClick={() => {
                if (!beliefDraft.trim()) return
                addBelief(record.id, beliefDraft, {
                  rationale: beliefRationale || undefined,
                  supportsBeliefId: parentBeliefId || undefined,
                  author: actor,
                })
                setBeliefDraft('')
                setBeliefRationale('')
                setParentBeliefId('')
                refresh()
              }}
            >
              Add belief
            </Button>
            <Button
              variant="text"
              disabled={assistBusy}
              sx={{ textTransform: 'none', fontWeight: 600 }}
              onClick={() => {
                void (async () => {
                  if (!record.goal.text.trim()) {
                    setAssistMsg('Write the goal first.')
                    return
                  }
                  setAssistBusy(true)
                  setAssistMsg(null)
                  try {
                    const res = await suggestBeliefs({
                      goal: record.goal.text,
                      existingStatements: record.beliefs.map((b) => b.text),
                      count: 3,
                    })
                    for (const s of res.suggestions) {
                      addBelief(record.id, s.text, { rationale: s.rationale, author: actor })
                    }
                    setAssistMsg(`Added ${res.suggestions.length} suggestions (${res.source}).`)
                    refresh()
                  } catch (err) {
                    setAssistMsg(err instanceof Error ? err.message : 'Assist failed')
                  } finally {
                    setAssistBusy(false)
                  }
                })()
              }}
            >
              Suggest beliefs
            </Button>
            <Button
              variant="text"
              disabled={assistBusy}
              sx={{ textTransform: 'none', fontWeight: 600 }}
              onClick={() => {
                void (async () => {
                  if (!record.goal.text || record.beliefs.length === 0) {
                    setAssistMsg('Need a goal and beliefs to check.')
                    return
                  }
                  setAssistBusy(true)
                  try {
                    const res = await checkBeliefsSupportGoal({
                      mainStatement: record.goal.text,
                      supportingStatements: record.beliefs.map((b) => b.text),
                    })
                    const weak = res.results.filter((r) => !r.implies || r.confidence === 'low')
                    setAssistMsg(
                      weak.length === 0
                        ? 'Beliefs look reasonably supportive of the goal.'
                        : `${weak.length} belief(s) may be weak support — allowed, worth a look.`,
                    )
                  } catch (err) {
                    setAssistMsg(err instanceof Error ? err.message : 'Check failed')
                  } finally {
                    setAssistBusy(false)
                  }
                })()
              }}
            >
              Check beliefs → goal
            </Button>
          </Stack>
          {assistMsg && <Alert severity="info">{assistMsg}</Alert>}
        </Stack>
      </Section>

      {/* Timeline */}
      <Section
        title="Timeline"
        subtitle="Milestones toward the goal. Each milestone has measures so you know if it’s on track."
      >
        <ReorderableList
          itemIds={timeline.map((m) => m.id)}
          onReorder={(ids) => {
            reorderMilestones(record.id, ids, actor)
            refresh()
          }}
        >
          {(msId, dragHandleProps) => {
            const ms = timeline.find((m) => m.id === msId)
            if (!ms) return null
            return (
              <Paper
                elevation={0}
                sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                data-testid="milestone-row"
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      component="span"
                      {...dragHandleProps}
                      sx={{ cursor: 'grab', color: 'text.secondary', userSelect: 'none' }}
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      value={ms.title}
                      onChange={(e) => {
                        updateMilestone(record.id, ms.id, { title: e.target.value }, actor)
                        refresh()
                      }}
                      inputProps={{ style: { fontWeight: 700 } }}
                    />
                    <TextField
                      select
                      size="small"
                      value={ms.status}
                      onChange={(e) => {
                        updateMilestone(record.id, ms.id, { status: e.target.value as MilestoneStatus }, actor)
                        refresh()
                      }}
                      sx={{ minWidth: 130 }}
                    >
                      <MenuItem value="planned">Planned</MenuItem>
                      <MenuItem value="in_progress">In progress</MenuItem>
                      <MenuItem value="done">Done</MenuItem>
                      <MenuItem value="missed">Missed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </TextField>
                  </Stack>
                  <TextField
                    size="small"
                    fullWidth
                    value={ms.description}
                    onChange={(e) => {
                      updateMilestone(record.id, ms.id, { description: e.target.value }, actor)
                      refresh()
                    }}
                    placeholder="What happens at this milestone?"
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Target date"
                    InputLabelProps={{ shrink: true }}
                    value={ms.targetDate ?? ''}
                    onChange={(e) => {
                      updateMilestone(record.id, ms.id, { targetDate: e.target.value || undefined }, actor)
                      refresh()
                    }}
                    sx={{ maxWidth: 200 }}
                  />

                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                    MEASURES
                  </Typography>
                  {ms.measures.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No measures yet — how will you know status?</Typography>
                  )}
                  {ms.measures.map((meas) => (
                    <Stack key={meas.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>{meas.description}</Typography>
                      <Chip size="small" label={meas.kind} sx={{ textTransform: 'capitalize' }} />
                      <TextField
                        select
                        size="small"
                        value={meas.status}
                        onChange={(e) => {
                          updateMilestoneMeasure(
                            record.id,
                            ms.id,
                            meas.id,
                            { status: e.target.value as MeasureStatus },
                            address,
                          )
                          refresh()
                        }}
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="unknown">Unknown</MenuItem>
                        <MenuItem value="on_track">On track</MenuItem>
                        <MenuItem value="at_risk">At risk</MenuItem>
                        <MenuItem value="met">Met</MenuItem>
                        <MenuItem value="missed">Missed</MenuItem>
                      </TextField>
                      <Button
                        size="small"
                        color="error"
                        variant="text"
                        sx={{ textTransform: 'none' }}
                        onClick={() => {
                          removeMeasureFromMilestone(record.id, ms.id, meas.id, actor)
                          refresh()
                        }}
                      >
                        Remove
                      </Button>
                    </Stack>
                  ))}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      select
                      size="small"
                      value={measureKinds[ms.id] ?? 'progress'}
                      onChange={(e) => setMeasureKinds((m) => ({ ...m, [ms.id]: e.target.value as MeasureKind }))}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="progress">Progress</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                      <MenuItem value="failure">Failure</MenuItem>
                    </TextField>
                    <TextField
                      size="small"
                      fullWidth
                      value={measureTexts[ms.id] ?? ''}
                      onChange={(e) => setMeasureTexts((m) => ({ ...m, [ms.id]: e.target.value }))}
                      placeholder="How we measure this milestone"
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                      onClick={() => {
                        const text = (measureTexts[ms.id] ?? '').trim()
                        if (!text) return
                        addMeasureToMilestone(
                          record.id,
                          ms.id,
                          { description: text, kind: measureKinds[ms.id] ?? 'progress' },
                          address,
                        )
                        setMeasureTexts((m) => ({ ...m, [ms.id]: '' }))
                        refresh()
                      }}
                    >
                      Add measure
                    </Button>
                  </Stack>

                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                    onClick={() => {
                      if (window.confirm(`Remove milestone “${ms.title}”?`)) {
                        removeMilestone(record.id, ms.id, actor)
                        refresh()
                      }
                    }}
                  >
                    Remove milestone
                  </Button>
                </Stack>
              </Paper>
            )
          }}
        </ReorderableList>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            placeholder="New milestone title"
          />
          <TextField
            size="small"
            type="date"
            label="Target"
            InputLabelProps={{ shrink: true }}
            value={msDate}
            onChange={(e) => setMsDate(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <Button
            variant="outlined"
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
            onClick={() => {
              if (!msTitle.trim()) return
              addMilestone(record.id, {
                title: msTitle,
                targetDate: msDate || undefined,
              }, actor)
              setMsTitle('')
              setMsDate('')
              refresh()
            }}
          >
            Add milestone
          </Button>
        </Stack>
      </Section>

      {/* Projects */}
      <Section
        title="Projects"
        subtitle="Work toward the goal and milestones. Supporters can stand by a project, volunteer in a role, or fund it."
      >
        <Stack spacing={1.5}>
          {record.projects.map((p) => (
            <Paper
              key={p.id}
              elevation={0}
              sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              data-testid="project-row"
            >
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    value={p.title}
                    onChange={(e) => {
                      updateProject(record.id, p.id, { title: e.target.value }, actor)
                      refresh()
                    }}
                    inputProps={{ style: { fontWeight: 700 } }}
                  />
                  <TextField
                    select
                    size="small"
                    value={p.status}
                    onChange={(e) => {
                      updateProject(record.id, p.id, { status: e.target.value as ProjectStatus }, actor)
                      refresh()
                    }}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="progress">Progress</MenuItem>
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="failure">Failure</MenuItem>
                  </TextField>
                </Stack>
                <TextField
                  size="small"
                  fullWidth
                  value={p.summary}
                  onChange={(e) => {
                    updateProject(record.id, p.id, { summary: e.target.value }, actor)
                    refresh()
                  }}
                  placeholder="What this project does"
                />
                <TextField
                  select
                  size="small"
                  label="Advances milestones"
                  value={p.milestoneIds[0] ?? ''}
                  onChange={(e) => {
                    const id = e.target.value
                    updateProject(
                      record.id,
                      p.id,
                      { milestoneIds: id ? [id] : [] },
                      address,
                    )
                    refresh()
                  }}
                  fullWidth
                >
                  <MenuItem value="">— none selected —</MenuItem>
                  {timeline.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
                  ))}
                </TextField>

                <Typography variant="caption" sx={{ fontWeight: 700 }}>STAND BY THIS PROJECT</Typography>
                {p.supporters.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No local supporters yet.</Typography>
                )}
                {p.supporters.map((s) => (
                  <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      {s.name || (s.address ? memberLabel(s.address) : 'Supporter')}
                      {s.note ? ` — ${s.note}` : ''}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      sx={{ textTransform: 'none' }}
                      onClick={() => {
                        removeProjectSupporter(record.id, p.id, s.id, actor)
                        refresh()
                      }}
                    >
                      Remove
                    </Button>
                  </Stack>
                ))}
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                  onClick={() => {
                    addProjectSupporter(record.id, p.id, {
                      address,
                      name: actor ? `@${actor}` : undefined,
                    }, address)
                    refresh()
                  }}
                >
                  Stand by project
                </Button>

                <Typography variant="caption" sx={{ fontWeight: 700 }}>VOLUNTEERS</Typography>
                {p.volunteers.map((v) => (
                  <Stack key={v.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      <strong>{v.role}</strong>
                      {v.name ? ` · ${v.name}` : ''}
                      {v.name ? ` · ${v.name}` : v.address ? ` · ${memberLabel(v.address)}` : ''}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      sx={{ textTransform: 'none' }}
                      onClick={() => {
                        removeProjectVolunteer(record.id, p.id, v.id, actor)
                        refresh()
                      }}
                    >
                      Remove
                    </Button>
                  </Stack>
                ))}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    value={volRole[p.id] ?? ''}
                    onChange={(e) => setVolRole((m) => ({ ...m, [p.id]: e.target.value }))}
                    placeholder="Role (e.g. Organizer, Writer)"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                    onClick={() => {
                      const role = (volRole[p.id] ?? '').trim()
                      if (!role) return
                      addProjectVolunteer(record.id, p.id, {
                        role,
                        address,
                        name: actor ? `@${actor}` : undefined,
                      }, address)
                      setVolRole((m) => ({ ...m, [p.id]: '' }))
                      refresh()
                    }}
                  >
                    Volunteer
                  </Button>
                </Stack>

                <Typography variant="caption" sx={{ fontWeight: 700 }}>FUNDING</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={p.fundingNote ?? ''}
                  onChange={(e) => {
                    updateProject(record.id, p.id, { fundingNote: e.target.value }, actor)
                    refresh()
                  }}
                  placeholder="Funding note or intent (e.g. matching pool, target)"
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {p.projectAddress && (
                    <Button
                      component="a"
                      href={getDomainUrl('lazyGiving', `/projects/${p.projectAddress}`, '#')}
                      target="_blank"
                      rel="noreferrer"
                      size="small"
                      sx={{ textTransform: 'none' }}
                    >
                      Open in LazyGiving
                    </Button>
                  )}
                  <Button
                    component="a"
                    href={getDomainUrl('lazyGiving', '/', '#')}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Fund via tools
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    sx={{ textTransform: 'none' }}
                    onClick={() => {
                      if (window.confirm(`Remove project “${p.title}”?`)) {
                        removeProjectLink(record.id, p.id, actor)
                        refresh()
                      }
                    }}
                  >
                    Remove project
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Link a project</Typography>
              <TextField
                size="small"
                fullWidth
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Project title"
              />
              <TextField
                size="small"
                fullWidth
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="On-chain address (optional, 0x…)"
              />
              <TextField
                size="small"
                fullWidth
                value={projectFunding}
                onChange={(e) => setProjectFunding(e.target.value)}
                placeholder="Funding note (optional)"
              />
              <Button
                variant="outlined"
                sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                onClick={() => {
                  if (!projectTitle.trim()) return
                  addProjectLink(record.id, {
                    title: projectTitle,
                    projectAddress: projectAddress || undefined,
                    fundingNote: projectFunding || undefined,
                    milestoneIds: timeline[0] ? [timeline[0].id] : [],
                  }, actor)
                  setProjectTitle('')
                  setProjectAddress('')
                  setProjectFunding('')
                  refresh()
                }}
              >
                Add project
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Section>

      {record.aggregateIds.length > 0 && (
        <Section title="Aggregates" subtitle="Bundles that include this cause.">
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {record.aggregateIds.map((id) => (
              <Chip key={id} component={RouterLink} to={`/aggregate/${id}`} clickable label={getAggregateTitle(id)} />
            ))}
          </Stack>
        </Section>
      )}

      <CauseHistory events={record.history ?? []} />

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'error.light' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main' }}>Danger zone</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.25 }}>
          Delete this cause from this device. On-chain published statements stay.
        </Typography>
        <Button
          color="error"
          variant="outlined"
          data-testid="cause-delete"
          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
          onClick={() => {
            if (window.confirm(`Delete cause “${record.title}”?`)) {
              deleteCause(record.id, actor)
              navigate('/causes')
            }
          }}
        >
          Delete cause
        </Button>
      </Paper>
    </Stack>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>{subtitle}</Typography>
      {children}
    </Box>
  )
}

function ShareRow({
  causeId,
  shareMsg,
  setShareMsg,
  onExported,
}: {
  causeId: string
  shareMsg: string | null
  setShareMsg: (s: string | null) => void
  onExported: () => void
}) {
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          data-testid="cause-copy-link"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
          onClick={() => {
            void copyTextToClipboard(causeLocalShareUrl(causeId))
              .then(() => setShareMsg('Local link copied (this browser).'))
              .catch(() => setShareMsg('Could not copy link.'))
          }}
        >
          Copy link
        </Button>
        <Button
          size="small"
          variant="outlined"
          data-testid="cause-copy-portable"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
          onClick={() => {
            void (async () => {
              const url = causePortableShareUrl(causeId)
              if (!url) {
                setShareMsg('Too large for portable link — use Export JSON.')
                return
              }
              try {
                await copyTextToClipboard(url)
                setShareMsg('Portable link copied — opens as an import for the recipient.')
              } catch {
                setShareMsg('Could not copy portable link.')
              }
            })()
          }}
        >
          Copy portable link
        </Button>
        <Button
          size="small"
          variant="outlined"
          data-testid="cause-export"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
          onClick={() => {
            try {
              downloadCauseExport(causeId)
              onExported()
              setShareMsg('JSON downloaded.')
            } catch (err) {
              setShareMsg(err instanceof Error ? err.message : 'Export failed')
            }
          }}
        >
          Export JSON
        </Button>
      </Stack>
      {shareMsg && (
        <Alert severity="info" onClose={() => setShareMsg(null)}>{shareMsg}</Alert>
      )}
    </Stack>
  )
}
