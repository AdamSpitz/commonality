/**
 * ui3 domain model — Causes (Issue #116 + refined definition).
 *
 * A **Cause** has:
 * - title
 * - one **goal** statement
 * - one or more **founders**
 * - **belief** statements from founders that motivate the goal
 * - a **timeline** of **milestones**, each with **measures** for status
 * - **projects** working toward the goal / milestones
 *
 * Supporters stand by goals and beliefs (on-chain when published).
 * They can also stand by projects, volunteer in roles, and fund them.
 */

export type StatementRole = 'goal' | 'belief'

export interface StatementVersion {
  id: string
  text: string
  cid?: string
  rationale?: string
  note?: string
  author?: string
  at: string
}

export interface StatementDraft {
  id: string
  role: StatementRole
  text: string
  rationale?: string
  supportsBeliefId?: string
  cid?: string
  history: StatementVersion[]
  createdAt: string
  updatedAt: string
}

export type MeasureKind = 'progress' | 'success' | 'failure'
export type MeasureStatus = 'unknown' | 'on_track' | 'at_risk' | 'met' | 'missed'
export type MilestoneStatus = 'planned' | 'in_progress' | 'done' | 'missed' | 'cancelled'
export type ProjectStatus = 'active' | 'progress' | 'success' | 'failure'

export interface MilestoneMeasure {
  id: string
  description: string
  kind: MeasureKind
  status: MeasureStatus
}

export interface Milestone {
  id: string
  title: string
  description: string
  /** Optional target date (YYYY-MM-DD). */
  targetDate?: string
  status: MilestoneStatus
  measures: MilestoneMeasure[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface ProjectVolunteer {
  id: string
  role: string
  name?: string
  address?: string
  at: string
}

export interface ProjectSupporter {
  id: string
  address?: string
  name?: string
  note?: string
  at: string
}

export interface CauseProject {
  id: string
  title: string
  summary: string
  /** Optional on-chain LazyGiving project address. */
  projectAddress?: string
  /** Milestones this project advances. */
  milestoneIds: string[]
  status: ProjectStatus
  volunteers: ProjectVolunteer[]
  /** Local “stand by this project” list (casual). */
  supporters: ProjectSupporter[]
  /** Free-text funding note / pledge intent; deep-link to tools for real funding. */
  fundingNote?: string
  createdAt: string
  updatedAt: string
}

export type CauseChangeKind =
  | 'created'
  | 'title_changed'
  | 'summary_changed'
  | 'founder_added'
  | 'founder_removed'
  | 'goal_edited'
  | 'goal_published'
  | 'goal_revised'
  | 'goal_restored'
  | 'belief_added'
  | 'belief_edited'
  | 'belief_published'
  | 'belief_revised'
  | 'belief_restored'
  | 'belief_removed'
  | 'belief_reordered'
  | 'milestone_added'
  | 'milestone_edited'
  | 'milestone_removed'
  | 'milestone_reordered'
  | 'measure_added'
  | 'measure_edited'
  | 'measure_removed'
  | 'project_linked'
  | 'project_edited'
  | 'project_status_changed'
  | 'project_removed'
  | 'volunteer_added'
  | 'volunteer_removed'
  | 'project_supporter_added'
  | 'project_supporter_removed'
  | 'cause_exported'
  | 'cause_imported'
  | 'aggregate_linked'

export interface CauseChangeEvent {
  id: string
  kind: CauseChangeKind
  label: string
  at: string
  author?: string
  subjectId?: string
  before?: string
  after?: string
}

export interface CauseRecord {
  id: string
  title: string
  summary: string
  /** The single goal statement for this cause. */
  goal: StatementDraft
  /** One or more founder wallet addresses. */
  founders: string[]
  beliefs: StatementDraft[]
  timeline: Milestone[]
  projects: CauseProject[]
  aggregateIds: string[]
  history: CauseChangeEvent[]
  createdAt: string
  updatedAt: string
}

export interface CauseAggregate {
  id: string
  title: string
  summary: string
  causeIds: string[]
  createdAt: string
  updatedAt: string
}

const CAUSES_KEY = 'ui3.causes.v1'
const AGGREGATES_KEY = 'ui3.aggregates.v1'

function nowIso(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function pushCauseEvent(
  cause: CauseRecord,
  event: Omit<CauseChangeEvent, 'id' | 'at'> & { at?: string },
): CauseRecord {
  return {
    ...cause,
    history: [
      ...(cause.history ?? []),
      {
        id: newId('chg'),
        at: event.at ?? nowIso(),
        kind: event.kind,
        label: event.label,
        author: event.author,
        subjectId: event.subjectId,
        before: event.before,
        after: event.after,
      },
    ],
  }
}

function emptyGoal(ts = nowIso()): StatementDraft {
  return {
    id: newId('goal'),
    role: 'goal',
    text: '',
    history: [{
      id: newId('ver'),
      text: '',
      note: 'Initial goal',
      at: ts,
    }],
    createdAt: ts,
    updatedAt: ts,
  }
}

function ensureStatementHistory(s: StatementDraft): StatementDraft {
  if (s.history && s.history.length > 0) return { ...s, role: s.role }
  const ts = s.createdAt || nowIso()
  return {
    ...s,
    history: [{
      id: newId('ver'),
      text: s.text,
      cid: s.cid,
      rationale: s.rationale,
      note: s.cid ? 'Published (imported)' : 'Initial draft (imported)',
      at: ts,
    }],
  }
}

/** Migrate legacy multi-goal causes into the new single-goal + timeline model. */
function migrateCause(raw: Record<string, unknown>): CauseRecord {
  const ts = nowIso()
  const title = typeof raw.title === 'string' ? raw.title : 'Untitled cause'
  const summary = typeof raw.summary === 'string' ? raw.summary : ''
  const id = typeof raw.id === 'string' ? raw.id : newId('cause')
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : ts
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : ts
  const aggregateIds = Array.isArray(raw.aggregateIds) ? raw.aggregateIds as string[] : []
  let history = Array.isArray(raw.history) ? raw.history as CauseChangeEvent[] : []

  // Founders
  let founders: string[] = []
  if (Array.isArray(raw.founders)) {
    founders = (raw.founders as string[]).filter(Boolean)
  } else if (typeof raw.founderAddress === 'string' && raw.founderAddress) {
    founders = [raw.founderAddress]
  }

  // Goal: new field, or first of legacy goals[]
  let goal: StatementDraft
  if (raw.goal && typeof raw.goal === 'object') {
    goal = ensureStatementHistory({ ...(raw.goal as StatementDraft), role: 'goal' })
  } else if (Array.isArray(raw.goals) && raw.goals.length > 0) {
    goal = ensureStatementHistory({ ...(raw.goals[0] as StatementDraft), role: 'goal' })
  } else {
    goal = emptyGoal(createdAt)
  }

  // Beliefs
  const beliefs = (Array.isArray(raw.beliefs) ? raw.beliefs as StatementDraft[] : [])
    .map((b) => ensureStatementHistory({ ...b, role: 'belief' }))

  // Timeline
  let timeline: Milestone[] = []
  if (Array.isArray(raw.timeline) && raw.timeline.length > 0) {
    timeline = (raw.timeline as Milestone[]).map((m, i) => ({
      ...m,
      measures: m.measures ?? [],
      order: m.order ?? i,
      description: m.description ?? '',
      status: m.status ?? 'planned',
    }))
  } else {
    // Legacy extra goals → milestones; legacy cause-level measures → first milestone
    const legacyGoals = Array.isArray(raw.goals) ? raw.goals as StatementDraft[] : []
    const extra = legacyGoals.slice(1)
    const legacyMeasures = Array.isArray(raw.measures)
      ? (raw.measures as Array<{ id?: string; kind?: MeasureKind; description?: string }>).map((m) => ({
          id: m.id ?? newId('measure'),
          description: m.description ?? '',
          kind: (m.kind ?? 'progress') as MeasureKind,
          status: 'unknown' as MeasureStatus,
        }))
      : []

    if (extra.length > 0 || legacyMeasures.length > 0) {
      let order = 0
      if (legacyMeasures.length > 0) {
        timeline.push({
          id: newId('ms'),
          title: 'Overall progress',
          description: 'Measures migrated from earlier cause drafts',
          status: 'planned',
          measures: legacyMeasures,
          order: order++,
          createdAt: createdAt,
          updatedAt: updatedAt,
        })
      }
      for (const g of extra) {
        timeline.push({
          id: newId('ms'),
          title: (g.text || 'Milestone').slice(0, 80),
          description: g.text || '',
          status: g.cid ? 'in_progress' : 'planned',
          measures: [],
          order: order++,
          createdAt: g.createdAt || createdAt,
          updatedAt: g.updatedAt || updatedAt,
        })
      }
    }
  }

  // Projects
  let projects: CauseProject[] = []
  if (Array.isArray(raw.projects)) {
    projects = (raw.projects as Array<Record<string, unknown>>).map((p) => ({
      id: String(p.id ?? newId('proj')),
      title: String(p.title ?? 'Project'),
      summary: String(p.summary ?? ''),
      projectAddress: p.projectAddress ? String(p.projectAddress) : undefined,
      milestoneIds: Array.isArray(p.milestoneIds)
        ? p.milestoneIds as string[]
        : Array.isArray(p.advancesGoalIds)
          ? []
          : [],
      status: (p.status as ProjectStatus) || 'active',
      volunteers: Array.isArray(p.volunteers) ? p.volunteers as ProjectVolunteer[] : [],
      supporters: Array.isArray(p.supporters) ? p.supporters as ProjectSupporter[] : [],
      fundingNote: p.fundingNote ? String(p.fundingNote) : undefined,
      createdAt: String(p.createdAt ?? createdAt),
      updatedAt: String(p.updatedAt ?? updatedAt),
    }))
  }

  if (history.length === 0) {
    history = [{
      id: newId('chg'),
      kind: 'created',
      label: `Cause “${title}” (imported)`,
      at: createdAt,
      author: founders[0],
    }]
  }

  return {
    id,
    title,
    summary,
    goal,
    founders,
    beliefs,
    timeline,
    projects,
    aggregateIds,
    history,
    createdAt,
    updatedAt,
  }
}

// ── Persistence ─────────────────────────────────────────────────────────────

export function listCauses(): CauseRecord[] {
  const list = readJson<unknown[]>(CAUSES_KEY, []).map((r) => migrateCause(r as Record<string, unknown>))
  return list.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getCause(id: string): CauseRecord | null {
  return listCauses().find((c) => c.id === id) ?? null
}

export function saveCause(cause: CauseRecord): CauseRecord {
  const list = readJson<unknown[]>(CAUSES_KEY, [])
  const next = { ...cause, updatedAt: nowIso() }
  const idx = list.findIndex((c) => (c as CauseRecord).id === next.id)
  if (idx >= 0) list[idx] = next
  else list.unshift(next)
  writeJson(CAUSES_KEY, list)
  return next
}

export function deleteCause(id: string, _author?: string): void {
  for (const agg of listAggregates()) {
    if (agg.causeIds.includes(id)) {
      saveAggregate({
        ...agg,
        causeIds: agg.causeIds.filter((cid) => cid !== id),
      })
    }
  }
  writeJson(CAUSES_KEY, listCauses().filter((c) => c.id !== id))
}

export function createCause(partial?: {
  title?: string
  summary?: string
  founderAddress?: string
  founders?: string[]
}): CauseRecord {
  const ts = nowIso()
  const title = partial?.title?.trim() || 'Untitled cause'
  const founders = partial?.founders?.length
    ? partial.founders
    : partial?.founderAddress
      ? [partial.founderAddress]
      : []
  const cause: CauseRecord = {
    id: newId('cause'),
    title,
    summary: partial?.summary?.trim() || '',
    goal: emptyGoal(ts),
    founders,
    beliefs: [],
    timeline: [],
    projects: [],
    aggregateIds: [],
    history: [{
      id: newId('chg'),
      kind: 'created',
      label: `Created cause “${title}”`,
      at: ts,
      author: founders[0],
    }],
    createdAt: ts,
    updatedAt: ts,
  }
  return saveCause(cause)
}

export function createCausePath(partial?: {
  title?: string
  summary?: string
  founderAddress?: string
}): string {
  return `/cause/${createCause(partial).id}`
}

export function updateCauseMeta(
  causeId: string,
  patch: Partial<Pick<CauseRecord, 'title' | 'summary'>>,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  let next = { ...cause }
  if (patch.title !== undefined && patch.title !== cause.title) {
    next = pushCauseEvent(next, {
      kind: 'title_changed',
      label: `Title → “${patch.title.trim() || 'Untitled'}”`,
      author,
      before: cause.title,
      after: patch.title.trim(),
    })
    next = { ...next, title: patch.title.trim() || 'Untitled cause' }
  }
  if (patch.summary !== undefined && patch.summary !== cause.summary) {
    next = pushCauseEvent(next, {
      kind: 'summary_changed',
      label: 'Summary updated',
      author,
      before: cause.summary,
      after: patch.summary,
    })
    next = { ...next, summary: patch.summary }
  }
  return saveCause(next)
}

// ── Founders ────────────────────────────────────────────────────────────────

export function addFounder(causeId: string, address: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const lower = address.toLowerCase()
  if (cause.founders.some((f) => f.toLowerCase() === lower)) return cause
  let next = pushCauseEvent(cause, {
    kind: 'founder_added',
    label: `Added founder ${address.slice(0, 10)}…`,
    author,
    after: address,
  })
  next = { ...next, founders: [...next.founders, address] }
  return saveCause(next)
}

export function removeFounder(causeId: string, address: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const lower = address.toLowerCase()
  if (!cause.founders.some((f) => f.toLowerCase() === lower)) return cause
  if (cause.founders.length <= 1) {
    // Keep at least empty list allowed; UI can warn
  }
  let next = pushCauseEvent(cause, {
    kind: 'founder_removed',
    label: `Removed founder ${address.slice(0, 10)}…`,
    author,
    before: address,
  })
  next = { ...next, founders: next.founders.filter((f) => f.toLowerCase() !== lower) }
  return saveCause(next)
}

export function claimFounder(causeId: string, address: string): CauseRecord | null {
  return addFounder(causeId, address, address)
}

/** Match founder by username or (legacy) wallet address. */
export function causesForMember(usernameOrAddress: string): CauseRecord[] {
  const lower = usernameOrAddress.toLowerCase().replace(/^@+/, '')
  return listCauses().filter((c) =>
    c.founders.some((f) => f.toLowerCase().replace(/^@+/, '') === lower),
  )
}

// ── Goal ────────────────────────────────────────────────────────────────────

function commitStatementEdit(
  statement: StatementDraft,
  input: { text: string; rationale?: string; note?: string; author?: string },
): { statement: StatementDraft; wasPublished: boolean; changed: boolean } {
  const text = input.text.trim()
  const rationale = input.rationale
  if (text === statement.text && rationale === statement.rationale) {
    return { statement, wasPublished: Boolean(statement.cid), changed: false }
  }
  const ts = nowIso()
  const wasPublished = Boolean(statement.cid)
  let history = [...(statement.history ?? [])]
  const last = history[history.length - 1]
  if (statement.cid && last && !last.cid) {
    history = [...history.slice(0, -1), { ...last, cid: statement.cid, note: last.note ?? 'Published' }]
  } else if (statement.cid && (!last || last.text !== statement.text || last.cid !== statement.cid)) {
    history = [...history, {
      id: newId('ver'),
      text: statement.text,
      cid: statement.cid,
      rationale: statement.rationale,
      note: 'Previous published version',
      author: input.author,
      at: statement.updatedAt || ts,
    }]
  }
  history = [...history, {
    id: newId('ver'),
    text,
    rationale,
    note: input.note
      ?? (wasPublished ? 'Revised (new draft superseding published)' : 'Edited draft'),
    author: input.author,
    at: ts,
  }]
  return {
    wasPublished,
    changed: true,
    statement: {
      ...statement,
      text,
      rationale,
      cid: wasPublished ? undefined : statement.cid,
      history,
      updatedAt: ts,
    },
  }
}

function markStatementPublished(
  statement: StatementDraft,
  cid: string,
  author?: string,
): StatementDraft {
  const ts = nowIso()
  let history = [...(statement.history ?? [])]
  const last = history[history.length - 1]
  if (last && last.text === statement.text && !last.cid) {
    history = [...history.slice(0, -1), {
      ...last,
      cid,
      note: last.note?.includes('Published') ? last.note : 'Published',
      author: author ?? last.author,
      at: ts,
    }]
  } else {
    history = [...history, {
      id: newId('ver'),
      text: statement.text,
      cid,
      rationale: statement.rationale,
      note: 'Published',
      author,
      at: ts,
    }]
  }
  return { ...statement, cid, history, updatedAt: ts }
}

export function commitGoalEdit(
  causeId: string,
  input: { text: string; rationale?: string; note?: string; author?: string },
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const { statement, wasPublished, changed } = commitStatementEdit(cause.goal, input)
  if (!changed) return cause
  let next = pushCauseEvent(cause, {
    kind: wasPublished ? 'goal_revised' : 'goal_edited',
    label: wasPublished
      ? `Revised goal: ${statement.text.slice(0, 80)}`
      : `Edited goal: ${statement.text.slice(0, 80)}`,
    author: input.author,
    before: cause.goal.text,
    after: statement.text,
  })
  next = { ...next, goal: statement }
  return saveCause(next)
}

export function markGoalPublished(causeId: string, cid: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const goal = markStatementPublished(cause.goal, cid, author)
  let next = pushCauseEvent(cause, {
    kind: 'goal_published',
    label: `Published goal: ${goal.text.slice(0, 80)}`,
    author,
    after: cid,
  })
  next = { ...next, goal }
  return saveCause(next)
}

export function restoreGoalVersion(causeId: string, versionId: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const version = cause.goal.history.find((v) => v.id === versionId)
  if (!version) return null
  const result = commitGoalEdit(causeId, {
    text: version.text,
    rationale: version.rationale,
    note: `Restored from ${version.at.slice(0, 10)}`,
    author,
  })
  if (!result) return null
  const last = result.history[result.history.length - 1]
  if (last && (last.kind === 'goal_edited' || last.kind === 'goal_revised')) {
    return saveCause({
      ...result,
      history: [
        ...result.history.slice(0, -1),
        { ...last, kind: 'goal_restored', label: `Restored goal: ${version.text.slice(0, 80)}` },
      ],
    })
  }
  return result
}

/** @deprecated multi-goal API — maps to single goal for compatibility. */
export function addGoal(causeId: string, text: string, author?: string): CauseRecord | null {
  return commitGoalEdit(causeId, { text, note: 'Set goal', author })
}

export function updateGoal(
  causeId: string,
  _goalId: string,
  patch: Partial<StatementDraft>,
): CauseRecord | null {
  if (patch.cid && !patch.text) return markGoalPublished(causeId, patch.cid)
  if (patch.text !== undefined) {
    return commitGoalEdit(causeId, { text: patch.text, rationale: patch.rationale })
  }
  return getCause(causeId)
}

export function removeGoal(_causeId: string, _goalId: string): CauseRecord | null {
  // Single goal cannot be removed; clear text instead
  return commitGoalEdit(_causeId, { text: '', note: 'Cleared goal' })
}

export function moveGoal(): CauseRecord | null { return null }
export function canMoveGoal(): boolean { return false }
export function reorderGoals(): CauseRecord | null { return null }

// ── Beliefs ─────────────────────────────────────────────────────────────────

export function addBelief(
  causeId: string,
  text: string,
  opts?: { rationale?: string; supportsBeliefId?: string; author?: string },
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const ts = nowIso()
  const trimmed = text.trim()
  const belief: StatementDraft = {
    id: newId('belief'),
    role: 'belief',
    text: trimmed,
    rationale: opts?.rationale,
    supportsBeliefId: opts?.supportsBeliefId,
    history: [{
      id: newId('ver'),
      text: trimmed,
      rationale: opts?.rationale,
      note: opts?.supportsBeliefId ? 'Supporting belief draft' : 'Initial draft',
      author: opts?.author,
      at: ts,
    }],
    createdAt: ts,
    updatedAt: ts,
  }
  let next = pushCauseEvent(cause, {
    kind: 'belief_added',
    label: `Added belief: ${trimmed.slice(0, 80)}`,
    author: opts?.author,
    subjectId: belief.id,
    after: trimmed,
  })
  next = { ...next, beliefs: [...next.beliefs, belief] }
  return saveCause(next)
}

export function commitBeliefEdit(
  causeId: string,
  beliefId: string,
  input: { text: string; rationale?: string; note?: string; author?: string },
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const belief = cause.beliefs.find((b) => b.id === beliefId)
  if (!belief) return null
  const { statement, wasPublished, changed } = commitStatementEdit(belief, input)
  if (!changed) return cause
  let next = pushCauseEvent(cause, {
    kind: wasPublished ? 'belief_revised' : 'belief_edited',
    label: wasPublished
      ? `Revised belief: ${statement.text.slice(0, 80)}`
      : `Edited belief: ${statement.text.slice(0, 80)}`,
    author: input.author,
    subjectId: beliefId,
    before: belief.text,
    after: statement.text,
  })
  next = {
    ...next,
    beliefs: next.beliefs.map((b) => (b.id === beliefId ? statement : b)),
  }
  return saveCause(next)
}

export function markBeliefPublished(
  causeId: string,
  beliefId: string,
  cid: string,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const belief = cause.beliefs.find((b) => b.id === beliefId)
  if (!belief) return null
  const updated = markStatementPublished(belief, cid, author)
  let next = pushCauseEvent(cause, {
    kind: 'belief_published',
    label: `Published belief: ${updated.text.slice(0, 80)}`,
    author,
    subjectId: beliefId,
    after: cid,
  })
  next = {
    ...next,
    beliefs: next.beliefs.map((b) => (b.id === beliefId ? updated : b)),
  }
  return saveCause(next)
}

export function restoreBeliefVersion(
  causeId: string,
  beliefId: string,
  versionId: string,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const belief = cause.beliefs.find((b) => b.id === beliefId)
  if (!belief) return null
  const version = belief.history.find((v) => v.id === versionId)
  if (!version) return null
  const result = commitBeliefEdit(causeId, beliefId, {
    text: version.text,
    rationale: version.rationale,
    note: `Restored from ${version.at.slice(0, 10)}`,
    author,
  })
  if (!result) return null
  const last = result.history[result.history.length - 1]
  if (last && (last.kind === 'belief_edited' || last.kind === 'belief_revised')) {
    return saveCause({
      ...result,
      history: [
        ...result.history.slice(0, -1),
        { ...last, kind: 'belief_restored', label: `Restored belief: ${version.text.slice(0, 80)}` },
      ],
    })
  }
  return result
}

export function removeBelief(causeId: string, beliefId: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const belief = cause.beliefs.find((b) => b.id === beliefId)
  if (!belief) return null
  const toRemove = new Set<string>([beliefId])
  let changed = true
  while (changed) {
    changed = false
    for (const b of cause.beliefs) {
      if (b.supportsBeliefId && toRemove.has(b.supportsBeliefId) && !toRemove.has(b.id)) {
        toRemove.add(b.id)
        changed = true
      }
    }
  }
  let next = pushCauseEvent(cause, {
    kind: 'belief_removed',
    label: `Removed belief: ${belief.text.slice(0, 80)}`,
    author,
    subjectId: beliefId,
    before: belief.text,
  })
  next = { ...next, beliefs: next.beliefs.filter((b) => !toRemove.has(b.id)) }
  return saveCause(next)
}

export function moveBelief(
  causeId: string,
  beliefId: string,
  direction: 'up' | 'down',
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const belief = cause.beliefs.find((b) => b.id === beliefId)
  if (!belief) return null
  const parentId = belief.supportsBeliefId
  const siblingIds = cause.beliefs
    .filter((b) => (b.supportsBeliefId ?? null) === (parentId ?? null))
    .map((b) => b.id)
  const siblingIndex = siblingIds.indexOf(beliefId)
  const swapSiblingIndex = direction === 'up' ? siblingIndex - 1 : siblingIndex + 1
  if (siblingIndex < 0 || swapSiblingIndex < 0 || swapSiblingIndex >= siblingIds.length) return cause
  const otherId = siblingIds[swapSiblingIndex]!
  const i = cause.beliefs.findIndex((b) => b.id === beliefId)
  const j = cause.beliefs.findIndex((b) => b.id === otherId)
  const beliefs = cause.beliefs.slice()
  const tmp = beliefs[i]!
  beliefs[i] = beliefs[j]!
  beliefs[j] = tmp
  let next = pushCauseEvent(cause, {
    kind: 'belief_reordered',
    label: `Moved belief ${direction}`,
    author,
    subjectId: beliefId,
  })
  next = { ...next, beliefs }
  return saveCause(next)
}

export function canMoveBelief(cause: CauseRecord, beliefId: string, direction: 'up' | 'down'): boolean {
  const belief = cause.beliefs.find((b) => b.id === beliefId)
  if (!belief) return false
  const siblings = cause.beliefs.filter(
    (b) => (b.supportsBeliefId ?? null) === (belief.supportsBeliefId ?? null),
  )
  const idx = siblings.findIndex((b) => b.id === beliefId)
  return direction === 'up' ? idx > 0 : idx >= 0 && idx < siblings.length - 1
}

export function reorderBeliefSiblings(
  causeId: string,
  parentBeliefId: string | null,
  orderedSiblingIds: string[],
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const siblings = cause.beliefs.filter(
    (b) => (b.supportsBeliefId ?? null) === (parentBeliefId ?? null),
  )
  if (orderedSiblingIds.length !== siblings.length) return cause
  const byId = new Map(siblings.map((b) => [b.id, b]))
  if (!orderedSiblingIds.every((id) => byId.has(id))) return cause
  if (orderedSiblingIds.every((id, i) => siblings[i]?.id === id)) return cause
  const ordered = orderedSiblingIds.map((id) => byId.get(id)!)
  let cursor = 0
  const beliefs = cause.beliefs.map((b) => {
    if ((b.supportsBeliefId ?? null) === (parentBeliefId ?? null)) {
      return ordered[cursor++]!
    }
    return b
  })
  let next = pushCauseEvent(cause, {
    kind: 'belief_reordered',
    label: parentBeliefId ? 'Reordered supporting beliefs' : 'Reordered beliefs',
    author,
  })
  next = { ...next, beliefs }
  return saveCause(next)
}

export function updateBelief(
  causeId: string,
  beliefId: string,
  patch: Partial<StatementDraft>,
): CauseRecord | null {
  if (patch.cid && !patch.text) return markBeliefPublished(causeId, beliefId, patch.cid)
  if (patch.text !== undefined) {
    return commitBeliefEdit(causeId, beliefId, { text: patch.text, rationale: patch.rationale })
  }
  return getCause(causeId)
}

// ── Timeline / milestones ───────────────────────────────────────────────────

export function addMilestone(
  causeId: string,
  input: { title: string; description?: string; targetDate?: string },
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const ts = nowIso()
  const milestone: Milestone = {
    id: newId('ms'),
    title: input.title.trim() || 'Milestone',
    description: input.description?.trim() || '',
    targetDate: input.targetDate,
    status: 'planned',
    measures: [],
    order: cause.timeline.length,
    createdAt: ts,
    updatedAt: ts,
  }
  let next = pushCauseEvent(cause, {
    kind: 'milestone_added',
    label: `Added milestone: ${milestone.title}`,
    author,
    subjectId: milestone.id,
  })
  next = { ...next, timeline: [...next.timeline, milestone] }
  return saveCause(next)
}

export function updateMilestone(
  causeId: string,
  milestoneId: string,
  patch: Partial<Pick<Milestone, 'title' | 'description' | 'targetDate' | 'status'>>,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const ms = cause.timeline.find((m) => m.id === milestoneId)
  if (!ms) return null
  const updated: Milestone = {
    ...ms,
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() || ms.title : ms.title,
    updatedAt: nowIso(),
  }
  let next = pushCauseEvent(cause, {
    kind: 'milestone_edited',
    label: `Updated milestone: ${updated.title}`,
    author,
    subjectId: milestoneId,
  })
  next = {
    ...next,
    timeline: next.timeline.map((m) => (m.id === milestoneId ? updated : m)),
  }
  return saveCause(next)
}

export function removeMilestone(causeId: string, milestoneId: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const ms = cause.timeline.find((m) => m.id === milestoneId)
  if (!ms) return null
  let next = pushCauseEvent(cause, {
    kind: 'milestone_removed',
    label: `Removed milestone: ${ms.title}`,
    author,
    subjectId: milestoneId,
  })
  next = {
    ...next,
    timeline: next.timeline
      .filter((m) => m.id !== milestoneId)
      .map((m, i) => ({ ...m, order: i })),
    projects: next.projects.map((p) => ({
      ...p,
      milestoneIds: p.milestoneIds.filter((id) => id !== milestoneId),
    })),
  }
  return saveCause(next)
}

export function reorderMilestones(
  causeId: string,
  orderedIds: string[],
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  if (orderedIds.length !== cause.timeline.length) return cause
  const byId = new Map(cause.timeline.map((m) => [m.id, m]))
  if (!orderedIds.every((id) => byId.has(id))) return cause
  if (orderedIds.every((id, i) => cause.timeline[i]?.id === id)) return cause
  const timeline = orderedIds.map((id, order) => ({ ...byId.get(id)!, order }))
  let next = pushCauseEvent(cause, {
    kind: 'milestone_reordered',
    label: 'Reordered timeline',
    author,
  })
  next = { ...next, timeline }
  return saveCause(next)
}

export function addMeasureToMilestone(
  causeId: string,
  milestoneId: string,
  input: { description: string; kind: MeasureKind },
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const ms = cause.timeline.find((m) => m.id === milestoneId)
  if (!ms) return null
  const measure: MilestoneMeasure = {
    id: newId('measure'),
    description: input.description.trim(),
    kind: input.kind,
    status: 'unknown',
  }
  let next = pushCauseEvent(cause, {
    kind: 'measure_added',
    label: `Measure on “${ms.title}”: ${measure.description.slice(0, 60)}`,
    author,
    subjectId: measure.id,
  })
  next = {
    ...next,
    timeline: next.timeline.map((m) =>
      m.id === milestoneId
        ? { ...m, measures: [...m.measures, measure], updatedAt: nowIso() }
        : m,
    ),
  }
  return saveCause(next)
}

export function updateMilestoneMeasure(
  causeId: string,
  milestoneId: string,
  measureId: string,
  patch: Partial<Pick<MilestoneMeasure, 'description' | 'kind' | 'status'>>,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  let next = pushCauseEvent(cause, {
    kind: 'measure_edited',
    label: 'Updated milestone measure',
    author,
    subjectId: measureId,
  })
  next = {
    ...next,
    timeline: next.timeline.map((m) => {
      if (m.id !== milestoneId) return m
      return {
        ...m,
        updatedAt: nowIso(),
        measures: m.measures.map((meas) =>
          meas.id === measureId ? { ...meas, ...patch } : meas,
        ),
      }
    }),
  }
  return saveCause(next)
}

export function removeMeasureFromMilestone(
  causeId: string,
  milestoneId: string,
  measureId: string,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  let next = pushCauseEvent(cause, {
    kind: 'measure_removed',
    label: 'Removed milestone measure',
    author,
    subjectId: measureId,
  })
  next = {
    ...next,
    timeline: next.timeline.map((m) =>
      m.id === milestoneId
        ? {
            ...m,
            updatedAt: nowIso(),
            measures: m.measures.filter((meas) => meas.id !== measureId),
          }
        : m,
    ),
  }
  return saveCause(next)
}

/** @deprecated use milestone measures */
export function addMeasure(
  causeId: string,
  kind: MeasureKind,
  description: string,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  if (cause.timeline.length === 0) {
    addMilestone(causeId, { title: 'Overall progress' }, author)
  }
  const refreshed = getCause(causeId)!
  const ms = refreshed.timeline[0]!
  return addMeasureToMilestone(causeId, ms.id, { kind, description }, author)
}

export function removeMeasure(causeId: string, measureId: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  for (const ms of cause.timeline) {
    if (ms.measures.some((m) => m.id === measureId)) {
      return removeMeasureFromMilestone(causeId, ms.id, measureId, author)
    }
  }
  return cause
}

// ── Projects ────────────────────────────────────────────────────────────────

export function addProjectLink(
  causeId: string,
  project: {
    title: string
    summary?: string
    projectAddress?: string
    milestoneIds?: string[]
    status?: ProjectStatus
    fundingNote?: string
  },
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const ts = nowIso()
  const link: CauseProject = {
    id: newId('proj'),
    title: project.title.trim() || 'Project',
    summary: project.summary?.trim() || '',
    projectAddress: project.projectAddress?.trim() || undefined,
    milestoneIds: project.milestoneIds ?? [],
    status: project.status ?? 'active',
    volunteers: [],
    supporters: [],
    fundingNote: project.fundingNote,
    createdAt: ts,
    updatedAt: ts,
  }
  let next = pushCauseEvent(cause, {
    kind: 'project_linked',
    label: `Linked project “${link.title}”`,
    author,
    subjectId: link.id,
  })
  next = { ...next, projects: [...next.projects, link] }
  return saveCause(next)
}

export function updateProject(
  causeId: string,
  projectId: string,
  patch: Partial<Pick<CauseProject, 'title' | 'summary' | 'projectAddress' | 'milestoneIds' | 'status' | 'fundingNote'>>,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const project = cause.projects.find((p) => p.id === projectId)
  if (!project) return null
  let next = pushCauseEvent(cause, {
    kind: patch.status && patch.status !== project.status
      ? 'project_status_changed'
      : 'project_edited',
    label: patch.status && patch.status !== project.status
      ? `Project “${project.title}”: ${project.status} → ${patch.status}`
      : `Updated project “${project.title}”`,
    author,
    subjectId: projectId,
    before: patch.status ? project.status : undefined,
    after: patch.status,
  })
  next = {
    ...next,
    projects: next.projects.map((p) =>
      p.id === projectId
        ? { ...p, ...patch, updatedAt: nowIso() }
        : p,
    ),
  }
  return saveCause(next)
}

export function updateProjectStatus(
  causeId: string,
  projectId: string,
  status: ProjectStatus,
  author?: string,
): CauseRecord | null {
  return updateProject(causeId, projectId, { status }, author)
}

export function removeProjectLink(causeId: string, projectId: string, author?: string): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const project = cause.projects.find((p) => p.id === projectId)
  if (!project) return null
  let next = pushCauseEvent(cause, {
    kind: 'project_removed',
    label: `Removed project “${project.title}”`,
    author,
    subjectId: projectId,
  })
  next = { ...next, projects: next.projects.filter((p) => p.id !== projectId) }
  return saveCause(next)
}

export function addProjectVolunteer(
  causeId: string,
  projectId: string,
  input: { role: string; name?: string; address?: string },
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const project = cause.projects.find((p) => p.id === projectId)
  if (!project) return null
  const volunteer: ProjectVolunteer = {
    id: newId('vol'),
    role: input.role.trim() || 'Volunteer',
    name: input.name?.trim(),
    address: input.address?.trim(),
    at: nowIso(),
  }
  let next = pushCauseEvent(cause, {
    kind: 'volunteer_added',
    label: `Volunteer on “${project.title}”: ${volunteer.role}`,
    author,
    subjectId: volunteer.id,
  })
  next = {
    ...next,
    projects: next.projects.map((p) =>
      p.id === projectId
        ? { ...p, volunteers: [...p.volunteers, volunteer], updatedAt: nowIso() }
        : p,
    ),
  }
  return saveCause(next)
}

export function removeProjectVolunteer(
  causeId: string,
  projectId: string,
  volunteerId: string,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  let next = pushCauseEvent(cause, {
    kind: 'volunteer_removed',
    label: 'Removed volunteer',
    author,
    subjectId: volunteerId,
  })
  next = {
    ...next,
    projects: next.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            volunteers: p.volunteers.filter((v) => v.id !== volunteerId),
            updatedAt: nowIso(),
          }
        : p,
    ),
  }
  return saveCause(next)
}

export function addProjectSupporter(
  causeId: string,
  projectId: string,
  input: { address?: string; name?: string; note?: string },
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  const project = cause.projects.find((p) => p.id === projectId)
  if (!project) return null
  const supporter: ProjectSupporter = {
    id: newId('psup'),
    address: input.address?.trim(),
    name: input.name?.trim(),
    note: input.note?.trim(),
    at: nowIso(),
  }
  let next = pushCauseEvent(cause, {
    kind: 'project_supporter_added',
    label: `Stood by project “${project.title}”`,
    author,
    subjectId: supporter.id,
  })
  next = {
    ...next,
    projects: next.projects.map((p) =>
      p.id === projectId
        ? { ...p, supporters: [...p.supporters, supporter], updatedAt: nowIso() }
        : p,
    ),
  }
  return saveCause(next)
}

export function removeProjectSupporter(
  causeId: string,
  projectId: string,
  supporterId: string,
  author?: string,
): CauseRecord | null {
  const cause = getCause(causeId)
  if (!cause) return null
  let next = pushCauseEvent(cause, {
    kind: 'project_supporter_removed',
    label: 'Removed project support',
    author,
    subjectId: supporterId,
  })
  next = {
    ...next,
    projects: next.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            supporters: p.supporters.filter((s) => s.id !== supporterId),
            updatedAt: nowIso(),
          }
        : p,
    ),
  }
  return saveCause(next)
}

// ── Queries / views ─────────────────────────────────────────────────────────

export function primaryGoal(cause: CauseRecord): StatementDraft | null {
  return cause.goal?.text?.trim() ? cause.goal : cause.goal ?? null
}

export function supportingBeliefs(cause: CauseRecord, beliefId: string): StatementDraft[] {
  return cause.beliefs.filter((b) => b.supportsBeliefId === beliefId)
}

export function rootBeliefs(cause: CauseRecord): StatementDraft[] {
  return cause.beliefs.filter((b) => !b.supportsBeliefId)
}

export function allStatements(cause: CauseRecord): StatementDraft[] {
  return [cause.goal, ...cause.beliefs].filter(Boolean)
}

export function draftStatements(cause: CauseRecord): StatementDraft[] {
  return allStatements(cause).filter((s) => s.text.trim() && !s.cid)
}

export function publishedStatements(cause: CauseRecord): StatementDraft[] {
  return allStatements(cause).filter((s) => Boolean(s.cid))
}

export function sortedTimeline(cause: CauseRecord): Milestone[] {
  return [...cause.timeline].sort((a, b) => a.order - b.order)
}

// ── Aggregates ──────────────────────────────────────────────────────────────

export function listAggregates(): CauseAggregate[] {
  return readJson<CauseAggregate[]>(AGGREGATES_KEY, [])
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getAggregate(id: string): CauseAggregate | null {
  return listAggregates().find((a) => a.id === id) ?? null
}

export function saveAggregate(agg: CauseAggregate): CauseAggregate {
  const list = listAggregates()
  const next = { ...agg, updatedAt: nowIso() }
  const idx = list.findIndex((a) => a.id === next.id)
  if (idx >= 0) list[idx] = next
  else list.unshift(next)
  writeJson(AGGREGATES_KEY, list)
  return next
}

export function createAggregate(title: string, summary = '', causeIds: string[] = []): CauseAggregate {
  const ts = nowIso()
  const agg: CauseAggregate = {
    id: newId('agg'),
    title: title.trim() || 'Untitled aggregate',
    summary: summary.trim(),
    causeIds: [...causeIds],
    createdAt: ts,
    updatedAt: ts,
  }
  const saved = saveAggregate(agg)
  for (const causeId of causeIds) {
    const cause = getCause(causeId)
    if (cause && !cause.aggregateIds.includes(saved.id)) {
      const withEvent = pushCauseEvent(cause, {
        kind: 'aggregate_linked',
        label: `Joined aggregate “${saved.title}”`,
        subjectId: saved.id,
      })
      saveCause({ ...withEvent, aggregateIds: [...withEvent.aggregateIds, saved.id] })
    }
  }
  return saved
}

export function addCauseToAggregate(aggregateId: string, causeId: string): CauseAggregate | null {
  const agg = getAggregate(aggregateId)
  if (!agg) return null
  if (agg.causeIds.includes(causeId)) return agg
  const saved = saveAggregate({ ...agg, causeIds: [...agg.causeIds, causeId] })
  const cause = getCause(causeId)
  if (cause && !cause.aggregateIds.includes(aggregateId)) {
    const withEvent = pushCauseEvent(cause, {
      kind: 'aggregate_linked',
      label: `Joined aggregate “${saved.title}”`,
      subjectId: saved.id,
    })
    saveCause({ ...withEvent, aggregateIds: [...withEvent.aggregateIds, aggregateId] })
  }
  return saved
}

export function removeCauseFromAggregate(aggregateId: string, causeId: string): CauseAggregate | null {
  const agg = getAggregate(aggregateId)
  if (!agg) return null
  const saved = saveAggregate({
    ...agg,
    causeIds: agg.causeIds.filter((id) => id !== causeId),
  })
  const cause = getCause(causeId)
  if (cause) {
    saveCause({
      ...cause,
      aggregateIds: cause.aggregateIds.filter((id) => id !== aggregateId),
    })
  }
  return saved
}

export function deleteAggregate(id: string): void {
  const agg = getAggregate(id)
  if (agg) {
    for (const causeId of agg.causeIds) {
      const cause = getCause(causeId)
      if (cause) {
        saveCause({
          ...cause,
          aggregateIds: cause.aggregateIds.filter((aid) => aid !== id),
        })
      }
    }
  }
  writeJson(AGGREGATES_KEY, listAggregates().filter((a) => a.id !== id))
}

export function getAggregateTitle(id: string): string {
  return getAggregate(id)?.title ?? id.slice(0, 12)
}

// ── Support targets (published statements) ──────────────────────────────────

export interface StatementSupportTarget {
  statementId: string
  role: StatementRole
  versionId: string
  text: string
  cid: string
  isCurrent: boolean
  at: string
}

export interface GoalSupportTarget extends StatementSupportTarget {
  causeId: string
  causeTitle: string
  goalId: string
}

export function statementPublishedSupportTargets(statement: StatementDraft): StatementSupportTarget[] {
  const out: StatementSupportTarget[] = []
  const seen = new Set<string>()
  if (statement.cid && !seen.has(statement.cid)) {
    seen.add(statement.cid)
    const tipVersion = [...(statement.history ?? [])].reverse().find((v) => v.cid === statement.cid)
    out.push({
      statementId: statement.id,
      role: statement.role,
      versionId: tipVersion?.id ?? statement.id,
      text: tipVersion?.text ?? statement.text,
      cid: statement.cid,
      isCurrent: true,
      at: tipVersion?.at ?? statement.updatedAt,
    })
  }
  for (const v of [...(statement.history ?? [])].reverse()) {
    if (!v.cid || seen.has(v.cid)) continue
    seen.add(v.cid)
    out.push({
      statementId: statement.id,
      role: statement.role,
      versionId: v.id,
      text: v.text,
      cid: v.cid,
      isCurrent: false,
      at: v.at,
    })
  }
  return out
}

export function previousPublishedVersions(statement: StatementDraft): StatementSupportTarget[] {
  return statementPublishedSupportTargets(statement).filter((t) => !t.isCurrent)
}

export function publishedGoalSupportTargets(cause: CauseRecord): GoalSupportTarget[] {
  return statementPublishedSupportTargets(cause.goal).map((t) => ({
    ...t,
    causeId: cause.id,
    causeTitle: cause.title,
    goalId: cause.goal.id,
  }))
}

export function publishedBeliefSupportTargets(cause: CauseRecord): StatementSupportTarget[] {
  return cause.beliefs.flatMap((b) => statementPublishedSupportTargets(b))
}

export function aggregateGoalSupportTargets(agg: CauseAggregate): GoalSupportTarget[] {
  const out: GoalSupportTarget[] = []
  for (const causeId of agg.causeIds) {
    const cause = getCause(causeId)
    if (cause) out.push(...publishedGoalSupportTargets(cause))
  }
  return out
}

export interface AggregateReadiness {
  causeCount: number
  goalsTotal: number
  goalsPublished: number
  publishedGoalCids: string[]
  allSupportableGoalCids: string[]
  previousVersionCount: number
}

export function aggregateReadiness(agg: CauseAggregate): AggregateReadiness {
  const targets = aggregateGoalSupportTargets(agg)
  let goalsTotal = 0
  let goalsPublished = 0
  const publishedGoalCids: string[] = []
  for (const causeId of agg.causeIds) {
    const cause = getCause(causeId)
    if (!cause) continue
    goalsTotal += 1
    if (cause.goal.cid) {
      goalsPublished += 1
      publishedGoalCids.push(cause.goal.cid)
    }
  }
  return {
    causeCount: agg.causeIds.length,
    goalsTotal,
    goalsPublished,
    publishedGoalCids,
    allSupportableGoalCids: targets.map((t) => t.cid),
    previousVersionCount: targets.filter((t) => !t.isCurrent).length,
  }
}

// ── Export / import / share ─────────────────────────────────────────────────

export const CAUSE_EXPORT_FORMAT = 'ui3.cause.v1' as const
export const CAUSE_BUNDLE_FORMAT = 'ui3.causes.bundle.v1' as const

export interface CauseExportDocument {
  format: typeof CAUSE_EXPORT_FORMAT
  exportedAt: string
  cause: CauseRecord
}

export interface CauseBundleDocument {
  format: typeof CAUSE_BUNDLE_FORMAT
  exportedAt: string
  causes: CauseRecord[]
}

export function exportCauseDocument(causeId: string): CauseExportDocument | null {
  const cause = getCause(causeId)
  if (!cause) return null
  return {
    format: CAUSE_EXPORT_FORMAT,
    exportedAt: nowIso(),
    cause: { ...cause, aggregateIds: [] },
  }
}

export function exportCauseJson(causeId: string): string | null {
  const doc = exportCauseDocument(causeId)
  return doc ? `${JSON.stringify(doc, null, 2)}\n` : null
}

export interface ImportCauseOptions {
  assignNewId?: boolean
  author?: string
  clearFounder?: boolean
}

function isStatementDraft(value: unknown): value is StatementDraft {
  if (!value || typeof value !== 'object') return false
  const s = value as StatementDraft
  return typeof s.id === 'string' && typeof s.text === 'string'
}

function isCauseRecordShape(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return typeof c.id === 'string' && typeof c.title === 'string'
}

export function importCauseFromJson(raw: string, options: ImportCauseOptions = {}): CauseRecord {
  const { assignNewId = true, author, clearFounder = true } = options
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid JSON — could not parse file.')
  }
  let causeRaw: unknown
  if (parsed && typeof parsed === 'object' && 'format' in parsed && 'cause' in parsed) {
    const doc = parsed as CauseExportDocument
    if (doc.format !== CAUSE_EXPORT_FORMAT) {
      throw new Error(`Unsupported export format: ${String(doc.format)}`)
    }
    causeRaw = doc.cause
  } else {
    causeRaw = parsed
  }
  if (!isCauseRecordShape(causeRaw)) {
    throw new Error('JSON is not a valid ui3 cause export.')
  }
  const ts = nowIso()
  let cause = migrateCause(causeRaw as Record<string, unknown>)
  if (assignNewId) cause = { ...cause, id: newId('cause') }
  if (clearFounder) {
    cause = { ...cause, founders: author ? [author] : [] }
  }
  cause = pushCauseEvent(cause, {
    kind: 'cause_imported',
    label: `Imported cause “${cause.title}”`,
    author,
    at: ts,
  })
  if (!assignNewId && getCause(cause.id)) {
    throw new Error(`A cause with id ${cause.id} already exists on this device.`)
  }
  return saveCause({ ...cause, aggregateIds: [], updatedAt: ts })
}

function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCauseExport(causeId: string): void {
  const json = exportCauseJson(causeId)
  if (!json) throw new Error('Cause not found.')
  const cause = getCause(causeId)!
  const slug = cause.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'cause'
  downloadTextFile(json, `ui3-cause-${slug}.json`)
  saveCause(pushCauseEvent(cause, { kind: 'cause_exported', label: 'Exported cause as JSON' }))
}

export function exportCausesBundleJson(causeIds?: string[]): string {
  const ids = causeIds ?? listCauses().map((c) => c.id)
  const causes: CauseRecord[] = []
  for (const id of ids) {
    const doc = exportCauseDocument(id)
    if (doc) causes.push(doc.cause)
  }
  if (causes.length === 0) throw new Error('No causes to export.')
  return `${JSON.stringify({
    format: CAUSE_BUNDLE_FORMAT,
    exportedAt: nowIso(),
    causes,
  } satisfies CauseBundleDocument, null, 2)}\n`
}

export function downloadCausesBundle(causeIds?: string[]): void {
  const json = exportCausesBundleJson(causeIds)
  const count = causeIds?.length ?? listCauses().length
  downloadTextFile(json, `ui3-causes-bundle-${count}.json`)
}

export interface ImportManyResult {
  causes: CauseRecord[]
  kind: 'single' | 'bundle'
}

export function importCausesFromJson(raw: string, options: ImportCauseOptions = {}): ImportManyResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid JSON — could not parse file.')
  }
  if (parsed && typeof parsed === 'object' && 'format' in parsed) {
    const fmt = (parsed as { format: string }).format
    if (fmt === CAUSE_BUNDLE_FORMAT) {
      const bundle = parsed as CauseBundleDocument
      if (!Array.isArray(bundle.causes) || bundle.causes.length === 0) {
        throw new Error('Bundle has no causes.')
      }
      const causes = bundle.causes.map((c) =>
        importCauseFromJson(JSON.stringify({
          format: CAUSE_EXPORT_FORMAT,
          exportedAt: bundle.exportedAt,
          cause: c,
        }), options),
      )
      return { causes, kind: 'bundle' }
    }
  }
  return { causes: [importCauseFromJson(raw, options)], kind: 'single' }
}

function isHashRoutingRuntime(): boolean {
  return import.meta.env.MODE === 'ipfs' || import.meta.env.VITE_HASH_ROUTING === 'true'
}

export function causeLocalShareUrl(
  causeId: string,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  return isHashRoutingRuntime()
    ? `${origin}/#/cause/${causeId}`
    : `${origin}/cause/${causeId}`
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const binary = typeof atob !== 'undefined'
    ? atob(b64 + pad)
    : Buffer.from(b64 + pad, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export const PORTABLE_SHARE_MAX_CHARS = 12_000

export function causePortableShareUrl(
  causeId: string,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
): string | null {
  const json = exportCauseJson(causeId)
  if (!json) return null
  const encoded = toBase64Url(JSON.stringify(JSON.parse(json)))
  if (encoded.length > PORTABLE_SHARE_MAX_CHARS) return null
  return isHashRoutingRuntime()
    ? `${origin}/#/import-cause?d=${encoded}`
    : `${origin}/import-cause?d=${encoded}`
}

export function decodePortableSharePayload(encoded: string): string {
  return fromBase64Url(encoded)
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

// ── Member timeline ─────────────────────────────────────────────────────────

export type TimelineKind =
  | 'cause_created'
  | 'goal_draft'
  | 'goal_published'
  | 'belief_draft'
  | 'belief_published'
  | 'project_linked'
  | 'aggregate_joined'
  | 'goal_edited'
  | 'belief_edited'
  | 'goal_restored'
  | 'belief_restored'

export interface TimelineItem {
  id: string
  kind: TimelineKind
  label: string
  at: string
  href?: string
}

export function engagementTimeline(address: string): TimelineItem[] {
  const items: TimelineItem[] = []
  const lower = address.toLowerCase()
  for (const cause of listCauses()) {
    if (!cause.founders.some((f) => f.toLowerCase() === lower)) continue
    for (const event of cause.history ?? []) {
      const kindMap: Partial<Record<CauseChangeKind, TimelineKind>> = {
        created: 'cause_created',
        goal_edited: 'goal_edited',
        goal_revised: 'goal_edited',
        goal_restored: 'goal_restored',
        goal_published: 'goal_published',
        belief_added: 'belief_draft',
        belief_edited: 'belief_edited',
        belief_revised: 'belief_edited',
        belief_restored: 'belief_restored',
        belief_published: 'belief_published',
        project_linked: 'project_linked',
        aggregate_linked: 'aggregate_joined',
      }
      const kind = kindMap[event.kind]
      if (!kind) continue
      items.push({
        id: event.id,
        kind,
        label: event.label,
        at: event.at,
        href: `/cause/${cause.id}`,
      })
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40)
}

export interface AuthoredStatement {
  causeId: string
  causeTitle: string
  statement: StatementDraft
}

export function authoredStatementsForMember(address: string): AuthoredStatement[] {
  const out: AuthoredStatement[] = []
  for (const cause of causesForMember(address)) {
    for (const statement of allStatements(cause)) {
      if (!statement.text.trim()) continue
      out.push({ causeId: cause.id, causeTitle: cause.title, statement })
    }
  }
  return out.sort((a, b) => b.statement.updatedAt.localeCompare(a.statement.updatedAt))
}

// silence unused helper for type guards in tests
void isStatementDraft
