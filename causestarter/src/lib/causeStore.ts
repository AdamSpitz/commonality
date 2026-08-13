/**
 * Local cause records for CauseStarter.
 *
 * A cause is a **versioned publication over planks** — immutable statements, each published
 * separately, each with its own signers, aligned projects, and earmarks. There
 * is no main statement: what a visitor sees is a **view**, a client-side set
 * operation over some subset of the planks, and "one main statement" is at most
 * a view someone later promoted to an anchor. See
 * `docs/founder/shaping-your-cause-statements.md`.
 *
 * On-chain truth still lives in the SDK/indexer. This store holds only what the
 * chain doesn't: which planks the organizer groups into one cause, and the
 * wording of planks not yet published.
 */

export type StatementOrigin = 'suggested' | 'user'

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

/**
 * One plank: a single-issue statement. Published planks carry a `cid` and are
 * immutable from then on — editing one would change what its signers signed.
 */
export interface CausePlank {
  id: string
  text: string
  origin: StatementOrigin
  rationale?: string
  safety?: SafetyState
  /** Published statement CID. Absent until this plank is published. */
  cid?: string
}

export interface CauseMediator {
  address: string
  serviceUrl: string
  name: string
  description: string
}

export interface CauseDraft {
  id: string
  planks: CausePlank[]
  createdAt: string
  updatedAt: string
  /**
   * Legacy free-text seed from an older "describe then auto-suggest issues"
   * flow. Still migrated from older localStorage shapes, but new starts no
   * longer set it and the cause page does not draft issues from it. A cause is
   * described by its planks.
   */
  suggestionSeed?: string
  /**
   * Optional founder-chosen page title. When absent, the page falls back to the
   * first plank; when a roster is published, the chosen (or fallback) title is
   * sealed into the roster document.
   */
  title?: string
  /**
   * Optional public summary shown on the cause page and sealed into the roster.
   * Distinct from {@link suggestionSeed}, which is never published.
   */
  summary?: string
  /**
   * Stable URL slug for the published roster ref `(founder, slug) → roster CID`.
   * Chosen once (or edited carefully) when the founder first publishes a roster.
   */
  slug?: string
  /** Founder address that owns the stable ref, once a roster has been published. */
  founderAddress?: string
  /** Latest published roster document CID known to this device. */
  rosterCid?: string
  /** Optional founder-operated mediator used by reusable bridge/opt-in blocks. */
  mediator?: CauseMediator
}

const STORAGE_KEY = 'causestarter.causes.v3'
const PREVIOUS_STORAGE_KEY = 'causestarter.causes.v2'
const LEGACY_STORAGE_KEY = 'causestarter.causes.v1'

interface PreviousCauseStatement {
  id: string
  text: string
  origin: StatementOrigin
  disposition: 'pending' | 'adopted' | 'rejected'
  rationale?: string
  safety?: SafetyState
}

interface LegacyCauseDraft {
  id: string
  name?: string
  audience?: string
  foundingStatement?: string
  createdAt?: string
  updatedAt?: string
  statementCid?: string
}

interface PreviousCauseDraft {
  id: string
  description?: string
  goal: string
  statements: PreviousCauseStatement[]
  createdAt: string
  updatedAt: string
  statementCid?: string
  statementCids?: string[]
  goalSafety?: SafetyState
  mediator?: CauseMediator
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Planks with text worth showing — a blank row the founder hasn't filled in yet isn't one. */
export function realPlanks(cause: CauseDraft): CausePlank[] {
  return cause.planks.filter((plank) => plank.text.trim())
}

export function publishedPlanks(cause: CauseDraft): CausePlank[] {
  return realPlanks(cause).filter((plank) => plank.cid)
}

export function unpublishedPlanks(cause: CauseDraft): CausePlank[] {
  return realPlanks(cause).filter((plank) => !plank.cid)
}

/** A cause is live once any plank of it is on chain. There is no launch event. */
export function isLive(cause: CauseDraft): boolean {
  return publishedPlanks(cause).length > 0
}

/**
 * Display title: founder-set title when present, otherwise the first plank
 * (truncated for chrome). Roster publish seals the full title into the document.
 */
export function causeTitle(cause: CauseDraft): string {
  const explicit = cause.title?.trim()
  if (explicit) {
    if (explicit.length <= 48) return explicit
    return `${explicit.slice(0, 45).trim()}…`
  }
  const first = realPlanks(cause)[0]
  if (!first) return 'Untitled cause'
  const trimmed = first.text.trim()
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 45).trim()}…`
}

/** Local path while drafting; stable `/cause/:owner/:slug` once published. */
export function causePath(cause: CauseDraft): string {
  if (cause.founderAddress && cause.slug) {
    return `/cause/${cause.founderAddress.toLowerCase()}/${encodeURIComponent(cause.slug)}`
  }
  return `/cause/${cause.id}`
}

/** Blocking safety applies per plank, and only to planks with text. */
export function hasBlockingSafety(cause: CauseDraft): boolean {
  return realPlanks(cause).some((plank) => plank.safety && !plank.safety.allowed)
}

export function newPlank(text = '', origin: StatementOrigin = 'user', cid?: string): CausePlank {
  return { id: crypto.randomUUID(), text, origin, cid }
}

function migratePreviousCauses(): CauseDraft[] {
  const raw = window.localStorage.getItem(PREVIOUS_STORAGE_KEY)
  if (!raw) return []
  const previous = JSON.parse(raw) as PreviousCauseDraft[]
  if (!Array.isArray(previous)) return []

  return previous.map((cause) => {
    const supportingCids = cause.statementCids ?? []
    const planks: CausePlank[] = []
    const trimmedGoal = cause.goal?.trim()
    const goalDuplicatesStatement = trimmedGoal && (cause.statements ?? []).some(
      (statement) => statement.text?.trim() === trimmedGoal,
    )
    if (trimmedGoal && !goalDuplicatesStatement) {
      planks.push({
        id: `goal-${cause.id}`,
        text: cause.goal,
        origin: 'user',
        safety: cause.goalSafety,
      })
    }

    let adoptedIndex = 0
    for (const statement of cause.statements ?? []) {
      if (!statement.text?.trim()) continue
      let cid: string | undefined
      if (statement.disposition === 'adopted') {
        // v2 published the first nonblank adopted statement as statementCid;
        // statementCids contains only the subsequent adopted statements.
        cid = adoptedIndex === 0
          ? cause.statementCid
          : supportingCids[adoptedIndex - 1]
        adoptedIndex += 1
      }
      planks.push({
        id: statement.id,
        text: statement.text,
        origin: statement.origin,
        rationale: statement.rationale,
        safety: statement.safety,
        cid,
      })
    }

    return {
      id: cause.id,
      planks,
      suggestionSeed: cause.description?.trim() || undefined,
      mediator: cause.mediator,
      createdAt: cause.createdAt,
      updatedAt: cause.updatedAt,
    }
  })
}

function migrateLegacyCauses(): CauseDraft[] {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return []
  const legacy = JSON.parse(raw) as LegacyCauseDraft[]
  if (!Array.isArray(legacy)) return []

  return legacy.map((cause) => {
    const now = new Date().toISOString()
    const primaryText = cause.foundingStatement?.trim() || cause.name?.trim() || ''
    const planks: CausePlank[] = []
    if (primaryText) {
      planks.push({
        id: `goal-${cause.id}`,
        text: primaryText,
        origin: 'user',
        cid: cause.statementCid,
      })
    }
    if (cause.audience?.trim()) {
      planks.push({
        id: `audience-${cause.id}`,
        text: `This cause is for ${cause.audience.trim()}.`,
        origin: 'user',
      })
    }
    return {
      id: cause.id,
      planks,
      createdAt: cause.createdAt ?? now,
      updatedAt: cause.updatedAt ?? now,
    }
  })
}

function parseCurrentCauses(): CauseDraft[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  const parsed = JSON.parse(raw) as CauseDraft[]
  return Array.isArray(parsed) ? parsed : []
}

function readAll(): CauseDraft[] {
  if (!canUseStorage()) return []
  try {
    const current = parseCurrentCauses()
    const previous = migratePreviousCauses()
    const legacy = migrateLegacyCauses()
    const merged = new Map<string, CauseDraft>()

    // Prefer the newest representation when the same cause exists in more than
    // one key, but still recover causes that were never migrated forward.
    for (const cause of legacy) merged.set(cause.id, cause)
    for (const cause of previous) merged.set(cause.id, cause)
    for (const cause of current) merged.set(cause.id, cause)

    if (previous.length > 0 || legacy.length > 0) {
      const causes = [...merged.values()]
      writeAll(causes)
      window.localStorage.removeItem(PREVIOUS_STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      return causes
    }
    return current
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

export function createCause(seed?: string): CauseDraft {
  const now = new Date().toISOString()
  const cause: CauseDraft = {
    id: crypto.randomUUID(),
    planks: [],
    suggestionSeed: seed?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  }
  writeAll([...readAll(), cause])
  return cause
}

/** Mint a local draft and return its editor path (`/cause/:id`). */
export function createCausePath(seed?: string): string {
  return causePath(createCause(seed))
}

/**
 * Apply a patch to a stored cause and return the result.
 *
 * Editing is continuous on the cause page rather than staged behind a save
 * step, so this is deliberately small: read, merge, write, hand back the new
 * value for the caller to render.
 */
export function updateCause(
  id: string,
  patch: Partial<Omit<CauseDraft, 'id' | 'createdAt'>>,
): CauseDraft | undefined {
  const causes = readAll()
  const index = causes.findIndex((cause) => cause.id === id)
  if (index < 0) return undefined
  const updated: CauseDraft = {
    ...causes[index]!,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  causes[index] = updated
  writeAll(causes)
  return updated
}

/** Record the CID and immutable wording a plank was just published under. */
export function markPlankPublished(
  causeId: string,
  plankId: string,
  cid: string,
  publishedText?: string,
): CauseDraft | undefined {
  const cause = getCause(causeId)
  if (!cause) return undefined
  return updateCause(causeId, {
    planks: cause.planks.map((plank) => (
      plank.id === plankId
        ? { ...plank, text: publishedText ?? plank.text, cid }
        : plank
    )),
  })
}

/** Record a successful roster publish on the local draft. */
export function markRosterPublished(
  causeId: string,
  args: { slug: string; founderAddress: string; rosterCid: string },
): CauseDraft | undefined {
  return updateCause(causeId, {
    slug: args.slug,
    founderAddress: args.founderAddress.toLowerCase(),
    rosterCid: args.rosterCid,
  })
}

export function deleteCause(id: string): void {
  writeAll(readAll().filter((cause) => cause.id !== id))
}
