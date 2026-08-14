import type { StatementListItem } from './types.js'

export type StatementPickerIntent = 'cause' | 'alignment' | 'delegation' | 'belief'

export interface StatementPickerSelection {
  text: string
  cid: string
  source: 'existing'
}

function words(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [])
}

/** Deterministic lexical ranking shared by every intent-specific statement picker. */
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
