import type { DomainId } from './domainUrls'
import { getDomainUrl } from './domainUrls'
import type { MomentumLever } from './causeStore'

export interface SupportingTool {
  id: string
  name: string
  role: string
  description: string
  domain: DomainId
  path: string
  levers: MomentumLever[]
  kind: 'substrate' | 'reference' | 'thesis'
}

/** Substrate and reference surfaces, framed as tools for a cause founder. */
export const SUPPORTING_TOOLS: SupportingTool[] = [
  {
    id: 'tally',
    name: 'Tally',
    role: 'Enroll supporters',
    description: 'Let people publicly stand with a pledge so your cause can show real numbers.',
    domain: 'tally',
    path: '/',
    levers: ['supporters'],
    kind: 'substrate',
  },
  {
    id: 'conceptspace',
    name: 'Conceptspace',
    role: 'Define the idea graph',
    description: 'Browse related pledges and ideas, and see how support connects across them.',
    domain: 'conceptspace',
    path: '/',
    levers: ['supporters', 'collaborators'],
    kind: 'substrate',
  },
  {
    id: 'lazyGiving',
    name: 'LazyGiving',
    role: 'Launch fundable projects',
    description: 'Kickstarter-style assurance contracts for concrete projects under your cause.',
    domain: 'lazyGiving',
    path: '/',
    levers: ['funding'],
    kind: 'substrate',
  },
  {
    id: 'alignment',
    name: 'Aligning',
    role: 'Cause boards & ongoing funding',
    description: 'Portals where aligned projects gather and donors fund the cause, not just one campaign.',
    domain: 'alignment',
    path: '/',
    levers: ['funding', 'collaborators'],
    kind: 'substrate',
  },
  {
    id: 'delegation',
    name: 'Delegation',
    role: 'Trust others with funding judgment',
    description: 'Let supporters who lack time follow a volunteer or collaborator they trust.',
    domain: 'lazyGiving',
    path: '/delegation/notes',
    levers: ['volunteers', 'collaborators', 'funding'],
    kind: 'substrate',
  },
  {
    id: 'content-funding',
    name: 'Content Funding',
    role: 'Back creators',
    description: 'Fund posts, videos, and channels that move people toward your goals.',
    domain: 'content-funding',
    path: '/',
    levers: ['content', 'funding'],
    kind: 'substrate',
  },
  {
    id: 'civility',
    name: 'Civility',
    role: 'Reference vertical',
    description: 'A worked example: bridge-building media as a focused cause, not a generic app.',
    domain: 'civility',
    path: '/',
    levers: ['content', 'supporters'],
    kind: 'reference',
  },
  {
    id: 'common-sense-majority',
    name: 'Common Sense Majority',
    role: 'Reference vertical',
    description: 'A movement vertical that composes signing, funding, and content for a hidden majority.',
    domain: 'common-sense-majority',
    path: '/',
    levers: ['supporters', 'funding', 'content'],
    kind: 'reference',
  },
  {
    id: 'commonality',
    name: 'Commonality',
    role: 'Thesis & movement layer',
    description: 'Background on why public-goods funding can work without a central owner.',
    domain: 'commonality',
    path: '/',
    levers: [],
    kind: 'thesis',
  },
]

export function toolHref(tool: SupportingTool): string {
  return getDomainUrl(tool.domain, tool.path, '#')
}

export function toolsForLevers(levers: MomentumLever[]): SupportingTool[] {
  if (levers.length === 0) return SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate')
  return SUPPORTING_TOOLS.filter(
    (tool) => tool.kind === 'substrate' && tool.levers.some((lever) => levers.includes(lever)),
  )
}
