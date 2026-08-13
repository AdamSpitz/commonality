import type { StatementListItem } from '@commonality/sdk/conceptspace'

export type StatementPickerIntent = 'cause' | 'alignment' | 'delegation' | 'belief'

export function parseTrustedNudgerAddresses(value: string | undefined): string[] {
  if (!value?.trim()) return []
  const valid = (candidate: unknown): candidate is string => (
    typeof candidate === 'string' && /^0x[a-fA-F0-9]{40}$/.test(candidate)
  )
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.flatMap((entry) => {
        if (valid(entry)) return [entry]
        if (entry && typeof entry === 'object' && valid((entry as { address?: unknown }).address)) {
          return [(entry as { address: string }).address]
        }
        return []
      })
    }
  } catch {
    // The supported fallback is a comma-separated address list.
  }
  return value.split(',').map((entry) => entry.trim()).filter(valid)
}

export interface StatementPickerSelection {
  text: string
  cid?: string
  source: 'existing' | 'drafted'
}

export interface StatementPickerContract {
  intent: StatementPickerIntent
  query: string
  existingStatements: readonly StatementListItem[]
  rejectedCids: ReadonlySet<string>
  selected: readonly StatementPickerSelection[]
  stage: 'intent' | 'retrieval' | 'correction' | 'review'
}

function words(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [])
}

/** Matches cause-assist `/atomize` `MAX_EXISTING_STATEMENTS`. */
export const MAX_EXISTING_PLANKS_FOR_ATOMIZE = 20

/** Cause-owned plank texts for `/atomize`, never the retrieved catalog. */
export function existingPlanksForAtomize(texts: readonly string[]): string[] | undefined {
  const cleaned = texts.map((text) => text.trim()).filter(Boolean).slice(0, MAX_EXISTING_PLANKS_FOR_ATOMIZE)
  return cleaned.length > 0 ? cleaned : undefined
}

/** Deterministic lexical ranking. Retrieval is always attempted before drafting. */
export function rankStatementMatches(
  query: string,
  statements: readonly StatementListItem[],
  excludedCids: ReadonlySet<string> = new Set(),
): StatementListItem[] {
  const queryWords = words(query)
  return statements
    .filter((statement) => !excludedCids.has(statement.cid))
    .map((statement, index) => {
      const text = `${statement.title ?? ''} ${statement.excerpt ?? ''}`
      const statementWords = words(text)
      let overlap = 0
      for (const word of queryWords) if (statementWords.has(word)) overlap += 1
      const exact = text.toLowerCase().includes(query.trim().toLowerCase()) ? 100 : 0
      return { statement, index, score: exact + overlap }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.statement.believerCount - a.statement.believerCount || a.index - b.index)
    .map(({ statement }) => statement)
}

export type StatementPickerEvent =
  | 'retrieval_started'
  | 'existing_selected'
  | 'suggestion_rejected'
  | 'none_fit'
  | 'draft_requested'
  | 'draft_selected'
  | 'flow_abandoned'

const TELEMETRY_KEY = 'causestarter.statement-picker-events.v1'

/** Local, content-free product instrumentation; never records intent or statement text. */
export function recordStatementPickerEvent(intent: StatementPickerIntent, event: StatementPickerEvent): void {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(window.localStorage.getItem(TELEMETRY_KEY) ?? '[]') as unknown[]
    const rows = Array.isArray(existing) ? existing : []
    rows.push({ intent, event, at: new Date().toISOString() })
    window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(rows.slice(-500)))
  } catch {
    // Instrumentation must never interrupt selection or approval.
  }
}
