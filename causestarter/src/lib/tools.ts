import type { DomainId } from './domainUrls'
import { getDomainUrl } from './domainUrls'
/**
 * How an organizer grows a cause. This is a taxonomy for *tools*, not a field on a
 * cause — a cause is its planks, and every growth surface stays available.
 */
export type MomentumLever =
  | 'supporters'
  | 'volunteers'
  | 'collaborators'
  | 'funding'
  | 'content'

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

/** Substrate and reference surfaces, framed as tools for a cause organizer. */
export const SUPPORTING_TOOLS: SupportingTool[] = [
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
