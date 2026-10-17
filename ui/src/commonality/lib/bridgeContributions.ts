/**
 * How much of a statement's indirect support, and of the money sitting on
 * implying statements, arrives through each bridge.
 *
 * Signers are credited to one bridge (first one found). A pledge belongs to
 * the statement it names, so amounts are not split. A project's raised total
 * is credited to one implying statement so the same pot is not added twice.
 */

export interface BridgeSupporter {
  user: string
  viaStatementCid: string
}

export interface BridgePledge {
  active: boolean
  token: string
  causeRef: string
  amountPerPeriod: string
  period: string
}

export interface BridgeProject {
  projectAddress: string
  alignmentType: 'direct' | 'indirect'
  viaStatementCids?: string[]
  totalReceived: string
  fundingCurrency: { symbol: string; decimals: number }
}

export interface RaisedAmount {
  symbol: string
  decimals: number
  amount: bigint
}

export interface BridgeContribution {
  viaStatementCid: string
  indirectSigners: number
  pledgedMonthly: bigint
  raised: RaisedAmount[]
}

export function buildBridgeContributions(input: {
  supporters: BridgeSupporter[]
  pledges: BridgePledge[]
  paymentToken?: string
  projects: BridgeProject[]
  viaStatementCids: string[]
}): { rows: BridgeContribution[]; omitted: number } {
  const vias = new Set(input.viaStatementCids)
  const signers = new Map<string, number>()
  const seenUsers = new Set<string>()
  for (const supporter of input.supporters) {
    if (!vias.has(supporter.viaStatementCid)) continue
    const user = supporter.user.toLowerCase()
    if (seenUsers.has(user)) continue
    seenUsers.add(user)
    signers.set(supporter.viaStatementCid, (signers.get(supporter.viaStatementCid) ?? 0) + 1)
  }

  const token = input.paymentToken?.toLowerCase()
  const pledged = new Map<string, bigint>()
  for (const pledge of input.pledges) {
    if (!pledge.active) continue
    if (!vias.has(pledge.causeRef)) continue
    if (!token || pledge.token.toLowerCase() !== token) continue
    const period = BigInt(pledge.period)
    if (period <= 0n) continue
    const amount = BigInt(pledge.amountPerPeriod) * 2_592_000n / period
    pledged.set(pledge.causeRef, (pledged.get(pledge.causeRef) ?? 0n) + amount)
  }

  const raised = new Map<string, Map<string, RaisedAmount>>()
  const seenProjects = new Set<string>()
  const directProjects = new Set(input.projects
    .filter((project) => project.alignmentType === 'direct')
    .map((project) => project.projectAddress.toLowerCase()))
  const indirect = input.projects
    .filter((project) => project.alignmentType === 'indirect'
      && !directProjects.has(project.projectAddress.toLowerCase()))
    .slice()
    .sort((a, b) => a.projectAddress.toLowerCase().localeCompare(b.projectAddress.toLowerCase()))
  for (const project of indirect) {
    const address = project.projectAddress.toLowerCase()
    if (seenProjects.has(address)) continue
    const via = (project.viaStatementCids ?? [])
      .filter((cid) => vias.has(cid))
      .slice()
      .sort()[0]
    if (!via) continue
    seenProjects.add(address)
    const amount = BigInt(project.totalReceived)
    if (amount <= 0n) continue
    const key = `${project.fundingCurrency.symbol}:${project.fundingCurrency.decimals}`
    const byCurrency = raised.get(via) ?? new Map<string, RaisedAmount>()
    const existing = byCurrency.get(key)
    byCurrency.set(key, {
      symbol: project.fundingCurrency.symbol,
      decimals: project.fundingCurrency.decimals,
      amount: (existing?.amount ?? 0n) + amount,
    })
    raised.set(via, byCurrency)
  }

  const all: BridgeContribution[] = []
  for (const viaStatementCid of vias) {
    const rowRaised = [...(raised.get(viaStatementCid)?.values() ?? [])]
    const indirectSigners = signers.get(viaStatementCid) ?? 0
    const pledgedMonthly = pledged.get(viaStatementCid) ?? 0n
    if (indirectSigners === 0 && pledgedMonthly === 0n && rowRaised.length === 0) continue
    all.push({ viaStatementCid, indirectSigners, pledgedMonthly, raised: rowRaised })
  }

  all.sort((a, b) =>
    b.indirectSigners - a.indirectSigners
    || (a.pledgedMonthly < b.pledgedMonthly ? 1 : a.pledgedMonthly > b.pledgedMonthly ? -1 : 0)
    || a.viaStatementCid.localeCompare(b.viaStatementCid))

  const largest = all.reduce((max, row) => Math.max(max, row.indirectSigners), 0)
  const threshold = largest === 0 ? 0 : Math.max(1, Math.ceil(largest * 0.1))
  const rows = all.filter((row) =>
    row.indirectSigners >= threshold || row.pledgedMonthly > 0n || row.raised.length > 0)
  return { rows, omitted: all.length - rows.length }
}
