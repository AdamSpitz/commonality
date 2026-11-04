export function statementCidInSet(statementCid: string, wanted: ReadonlySet<string>): boolean {
  return wanted.has(statementCid)
}
