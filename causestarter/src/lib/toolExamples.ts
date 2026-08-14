import {
  browseStatements,
  getImplicationsFrom,
  type StatementListItem,
} from '@commonality/sdk/conceptspace'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { getAllProjects } from '@commonality/sdk/lazy-giving'
import { getProspectiveRounds } from '@commonality/sdk/content-funding'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import type { SupportingTool } from './tools'
import { getDomainUrl } from './domainUrls'

export interface ToolExample {
  /** Primary line shown to the user. */
  label: string
  /** Optional secondary line (counts, role, etc.). */
  detail?: string
  /** Deep link into the tool domain when available. */
  href?: string
}

function shortText(value: string | undefined, fallback: string, max = 96): string {
  const text = value?.trim() || fallback
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

function statementLabel(item: StatementListItem | undefined, cid: string): string {
  if (!item) return `Statement ${cid.slice(0, 10)}…`
  return shortText(item.title || item.excerpt, `Statement ${cid.slice(0, 10)}…`)
}

/**
 * Fetch up to 2 live examples for a tool domain.
 * Failures return [] so the tool card still works offline / without indexer data.
 */
export async function loadToolExamples(
  tool: SupportingTool,
  machinery: SDKMachinery,
): Promise<ToolExample[]> {
  try {
    switch (tool.id) {
      case 'common-sense-majority':
        return await loadStatementImplicationExamples(machinery, tool.domain)
      case 'content-funding':
        return await loadContentFundingExamples(machinery, tool.domain, Boolean(tool.internalPath))
      case 'civility':
        return await loadContentFundingExamples(machinery, tool.domain, false)
      case 'delegation':
        return await loadDelegationHintExamples(machinery)
      default:
        return []
    }
  } catch (error) {
    console.warn(`tool examples for ${tool.id} unavailable:`, error)
    return []
  }
}

async function loadStatementImplicationExamples(
  machinery: SDKMachinery,
  domain: SupportingTool['domain'],
): Promise<ToolExample[]> {
  const statements = await browseStatements(machinery, {
    limit: 12,
    orderBy: 'believerCount',
  })
  if (statements.length === 0) return []

  const byCid = new Map(statements.map((s) => [s.cid, s]))
  const examples: ToolExample[] = []

  // Prefer connected implication pairs (A implies B).
  for (const statement of statements) {
    if (examples.length >= 2) break
    try {
      const implications = await getImplicationsFrom(machinery, statement.cid as IpfsCidV1)
      for (const implication of implications) {
        if (examples.length >= 2) break
        const from = statementLabel(byCid.get(implication.fromStatementCid) ?? statement, implication.fromStatementCid)
        // Resolve target title if we already have it; otherwise short CID.
        let toItem = byCid.get(implication.toStatementCid)
        if (!toItem) {
          // Look up later in list only; avoid extra network for every edge.
          toItem = statements.find((s) => s.cid === implication.toStatementCid)
        }
        const to = statementLabel(toItem, implication.toStatementCid)
        examples.push({
          label: `${from} → ${to}`,
          detail: 'Connected implication · public statements',
          href: getDomainUrl(domain, `/statement/${implication.toStatementCid}`, '#'),
        })
      }
    } catch {
      // continue with other statements
    }
  }

  // If the graph has no implications yet, fall back to popular statements themselves.
  if (examples.length === 0) {
    for (const statement of statements.slice(0, 2)) {
      examples.push({
        label: statementLabel(statement, statement.cid),
        detail: `${statement.believerCount} supporters`,
        href: getDomainUrl(domain, `/statement/${statement.cid}`, '#'),
      })
    }
  }

  return examples.slice(0, 2)
}

async function loadContentFundingExamples(
  machinery: SDKMachinery,
  domain: SupportingTool['domain'],
  internal: boolean,
): Promise<ToolExample[]> {
  const rounds = await getProspectiveRounds(machinery)
  if (rounds.length > 0) {
    return rounds.slice(0, 2).map((round) => {
      const short = `${round.round.slice(0, 6)}…${round.round.slice(-4)}`
      const status = round.materializedToken ? 'Materialized' : 'Open round'
      return {
        label: `Content round ${short}`,
        detail: status,
        href: internal ? '/content' : getDomainUrl(domain, '/', '#'),
      }
    })
  }

  // Fallback: popular statements often seed content verticals.
  const statements = await browseStatements(machinery, {
    limit: 2,
    orderBy: 'believerCount',
  })
  return statements.map((statement) => ({
    label: statementLabel(statement, statement.cid),
    detail: 'Related public statement',
    href: `/statement/${statement.cid}`,
  }))
}

async function loadDelegationHintExamples(machinery: SDKMachinery): Promise<ToolExample[]> {
  // Delegation is note/owner specific; surface popular fundable projects as
  // the kind of work delegates route funding toward.
  const projects = await getAllProjects(machinery)
  return projects.slice(0, 2).map((project) => {
    const shortId = `${project.id.slice(0, 6)}…${project.id.slice(-4)}`
    return {
      label: `Fundable work ${shortId}`,
      detail: 'Example target for delegated judgment',
      href: getDomainUrl('lazyGiving', `/delegation/notes`, '#'),
    }
  })
}
