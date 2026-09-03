/** Normalize host props: one statement, or a cause's published planks. */
export function resolveStatementCids(
  statementCid: string | undefined,
  statementCids: string[] | undefined,
): string[] {
  if (statementCids && statementCids.length > 0) {
    return [...new Set(statementCids.filter(Boolean))]
  }
  return statementCid ? [statementCid] : []
}
