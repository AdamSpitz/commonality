/**
 * Local cause records for CauseStarter.
 *
 * A cause is a **set of planks** — single-issue statements, each published
 * separately, each with its own signers, aligned projects, and earmarks. There
 * is no main statement: what a visitor sees is a **view**, a client-side set
 * operation over some subset of the planks, and "one main statement" is at most
 * a view someone later promoted to an anchor. See
 * `docs/founder/shaping-your-cause-statements.md`.
 *
 * On-chain truth still lives in the SDK/indexer. This store holds only what the
 * chain doesn't: which planks the founder groups into one cause, and the
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
   * Rough description of the cause, kept **only** as the seed for plank
   * suggestions. It is not a statement, is never published, and is never shown
   * as page content — a cause is described by its planks.
   */
  suggestionSeed?: string
  /** Optional founder-operated mediator used by reusable bridge/opt-in blocks. */
  mediator?: CauseMediator
}

const STORAGE_KEY = 'causestarter.causes.v3'

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
 * A cause has no title of its own — it is titled by its first plank, truncated.
 * Anything else would be an unpublished claim about the cause competing with the
 * statements that actually constitute it.
 */
export function causeTitle(cause: CauseDraft): string {
  const first = realPlanks(cause)[0]
  if (!first) return 'Untitled cause'
  const trimmed = first.text.trim()
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 45).trim()}…`
}

/** Blocking safety applies per plank, and only to planks with text. */
export function hasBlockingSafety(cause: CauseDraft): boolean {
  return realPlanks(cause).some((plank) => plank.safety && !plank.safety.allowed)
}

export function newPlank(text = '', origin: StatementOrigin = 'user'): CausePlank {
  return { id: crypto.randomUUID(), text, origin }
}

function readAll(): CauseDraft[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CauseDraft[]
    return Array.isArray(parsed) ? parsed : []
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

/** Record the CID a plank was just published under. */
export function markPlankPublished(
  causeId: string,
  plankId: string,
  cid: string,
): CauseDraft | undefined {
  const cause = getCause(causeId)
  if (!cause) return undefined
  return updateCause(causeId, {
    planks: cause.planks.map((plank) => (plank.id === plankId ? { ...plank, cid } : plank)),
  })
}

export function deleteCause(id: string): void {
  writeAll(readAll().filter((cause) => cause.id !== id))
}
