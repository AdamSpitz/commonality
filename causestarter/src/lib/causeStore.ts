/**
 * Local drafts and launched-cause bookmarks for CauseStarter.
 * On-chain truth still lives in the SDK/indexer; this store tracks the founder's
 * journey (wizard progress, adopted statements, safety state).
 */

export type MomentumLever =
  | 'supporters'
  | 'volunteers'
  | 'collaborators'
  | 'funding'
  | 'content'

export type StatementDisposition = 'pending' | 'adopted' | 'rejected'

export type SafetyCategory =
  | 'ok'
  | 'illegal_activity'
  | 'sanctions_or_terror'
  | 'fraud_or_scam'
  | 'hate_or_harassment'
  | 'doxxing_or_pii'
  | 'political_campaign_funding'
  | 'misrepresentation'
  | 'other_policy'

export interface SafetyState {
  allowed: boolean
  category: SafetyCategory
  explanation: string
  checkedAt: string
}

export interface ImplicationState {
  implies: boolean
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  keyDifference?: string
  checkedAt: string
}

export interface CauseStatement {
  id: string
  text: string
  origin: 'suggested' | 'user'
  disposition: StatementDisposition
  rationale?: string
  role?: string
  safety?: SafetyState
  /** Whether the main statement implies this supporting statement. */
  implication?: ImplicationState
}

export interface CauseMediator {
  address: string
  serviceUrl: string
  name: string
  description: string
}

export interface CauseDraft {
  id: string
  /** What the cause intends to accomplish. */
  goal: string
  /** Optional short label for lists (defaults to truncated goal). */
  name: string
  statements: CauseStatement[]
  levers: MomentumLever[]
  createdAt: string
  updatedAt: string
  /** Primary published goal statement CID (if launched). */
  statementCid?: string
  /** Additional published supporting statement CIDs. */
  statementCids?: string[]
  status: 'draft' | 'launched'
  goalSafety?: SafetyState
  /** Optional founder-operated mediator used by reusable bridge/opt-in blocks. */
  mediator?: CauseMediator
}

const STORAGE_KEY = 'causestarter.causes.v2'
const LEGACY_STORAGE_KEY = 'causestarter.causes.v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function displayNameFromGoal(goal: string): string {
  const trimmed = goal.trim()
  if (!trimmed) return 'Untitled cause'
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 45).trim()}…`
}

function migrateLegacy(): CauseDraft[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const legacy = JSON.parse(raw) as Array<{
      id: string
      name?: string
      audience?: string
      foundingStatement?: string
      levers?: MomentumLever[]
      createdAt?: string
      updatedAt?: string
      statementCid?: string
      status?: 'draft' | 'launched'
    }>
    if (!Array.isArray(legacy)) return []
    return legacy.map((item) => {
      const goal = item.foundingStatement?.trim() || item.name?.trim() || ''
      const statements: CauseStatement[] = []
      if (item.audience?.trim()) {
        statements.push({
          id: crypto.randomUUID(),
          text: `This cause is for ${item.audience.trim()}.`,
          origin: 'user',
          disposition: 'adopted',
        })
      }
      return {
        id: item.id,
        goal,
        name: item.name?.trim() || displayNameFromGoal(goal),
        statements,
        levers: item.levers ?? ['supporters'],
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
        statementCid: item.statementCid,
        status: item.status ?? 'draft',
      } satisfies CauseDraft
    })
  } catch {
    return []
  }
}

function readAll(): CauseDraft[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as CauseDraft[]
      return Array.isArray(parsed) ? parsed : []
    }
    const migrated = migrateLegacy()
    if (migrated.length > 0) {
      writeAll(migrated)
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    return migrated
  } catch {
    return []
  }
}

function writeAll(causes: CauseDraft[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(causes))
}

export function listCauses(): CauseDraft[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getCause(id: string): CauseDraft | undefined {
  return readAll().find((cause) => cause.id === id)
}

export function adoptedStatements(cause: CauseDraft): CauseStatement[] {
  return cause.statements.filter((s) => s.disposition === 'adopted' && s.text.trim())
}

/**
 * Only the goal and *adopted* statements block save/continue/publish.
 * Pending suggestions can be blocked in the UI without trapping the wizard.
 */
export function hasBlockingSafety(cause: Pick<CauseDraft, 'goal' | 'goalSafety' | 'statements'>): boolean {
  if (cause.goalSafety && !cause.goalSafety.allowed) return true
  return cause.statements.some(
    (s) => s.disposition === 'adopted' && s.safety && !s.safety.allowed && s.text.trim(),
  )
}

/**
 * Adopted supporting statements that fail a medium/high-confidence implication
 * check against the main statement. Low-confidence (e.g. offline heuristic)
 * results do not block — the founder still gets a warning in the UI.
 */
export function hasBlockingImplication(
  statements: CauseStatement[],
): boolean {
  return statements.some((s) => {
    if (s.disposition !== 'adopted' || !s.text.trim() || !s.implication) return false
    if (s.implication.implies) return false
    return s.implication.confidence !== 'low'
  })
}

export function saveCause(input: {
  id?: string
  goal: string
  name?: string
  statements: CauseStatement[]
  levers: MomentumLever[]
  status?: CauseDraft['status']
  statementCid?: string
  statementCids?: string[]
  goalSafety?: SafetyState
  mediator?: CauseMediator
}): CauseDraft {
  const now = new Date().toISOString()
  const causes = readAll()
  const existingIndex = input.id ? causes.findIndex((c) => c.id === input.id) : -1
  const name = input.name?.trim() || displayNameFromGoal(input.goal)

  if (existingIndex >= 0) {
    const existing = causes[existingIndex]!
    const updated: CauseDraft = {
      ...existing,
      goal: input.goal,
      name,
      statements: input.statements,
      levers: input.levers,
      status: input.status ?? existing.status,
      statementCid: input.statementCid ?? existing.statementCid,
      statementCids: input.statementCids ?? existing.statementCids,
      goalSafety: input.goalSafety ?? existing.goalSafety,
      mediator: input.mediator ?? existing.mediator,
      updatedAt: now,
    }
    causes[existingIndex] = updated
    writeAll(causes)
    return updated
  }

  const created: CauseDraft = {
    id: input.id ?? crypto.randomUUID(),
    goal: input.goal,
    name,
    statements: input.statements,
    levers: input.levers,
    status: input.status ?? 'draft',
    statementCid: input.statementCid,
    statementCids: input.statementCids,
    goalSafety: input.goalSafety,
    mediator: input.mediator,
    createdAt: now,
    updatedAt: now,
  }
  causes.push(created)
  writeAll(causes)
  return created
}

export function markCauseLaunched(
  id: string,
  primaryCid: string,
  extraCids: string[] = [],
): CauseDraft | undefined {
  const causes = readAll()
  const index = causes.findIndex((c) => c.id === id)
  if (index < 0) return undefined
  const updated: CauseDraft = {
    ...causes[index]!,
    status: 'launched',
    statementCid: primaryCid,
    statementCids: extraCids,
    updatedAt: new Date().toISOString(),
  }
  causes[index] = updated
  writeAll(causes)
  return updated
}

export function deleteCause(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id))
}

export const LEVER_LABELS: Record<MomentumLever, { label: string; short: string; description: string }> = {
  supporters: {
    label: 'Supporters',
    short: 'Sign',
    description: 'People who publicly stand with your statements.',
  },
  volunteers: {
    label: 'Volunteers',
    short: 'Help',
    description: 'People who will do work — outreach, research, organizing.',
  },
  collaborators: {
    label: 'Collaborators',
    short: 'Build',
    description: 'Peers who co-own strategy or run related projects with you.',
  },
  funding: {
    label: 'Funding',
    short: 'Fund',
    description: 'Assurance contracts and cause-aligned project funding.',
  },
  content: {
    label: 'Content',
    short: 'Media',
    description: 'Fund creators and channels that advance the cause.',
  },
}
