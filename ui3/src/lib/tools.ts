import type { DomainId } from './domainUrls'
import { getDomainUrl } from './domainUrls'

/**
 * Online tools ui3 can open. Localhost still uses Hardhat wallets;
 * these links hit the gateway domain SPAs (or configured VITE_* URLs).
 */
export type ToolKind = 'funding' | 'delegation' | 'content' | 'statements' | 'reference'

export interface OnlineTool {
  id: string
  name: string
  role: string
  description: string
  domain: DomainId
  path: string
  kind: ToolKind
}

export const ONLINE_TOOLS: OnlineTool[] = [
  {
    id: 'lazy-giving',
    name: 'LazyGiving',
    role: 'Projects & funding',
    description: 'Create and fund projects that advance one or more goals.',
    domain: 'lazyGiving',
    path: '/',
    kind: 'funding',
  },
  {
    id: 'delegation',
    name: 'Delegation',
    role: 'Trust others with judgment',
    description: 'See who you support via delegation — and who supports you.',
    domain: 'lazyGiving',
    path: '/delegation/notes',
    kind: 'delegation',
  },
  {
    id: 'content-funding',
    name: 'Content Funding',
    role: 'Back creators',
    description: 'Fund posts and channels that move people toward shared goals.',
    domain: 'content-funding',
    path: '/',
    kind: 'content',
  },
  {
    id: 'conceptspace',
    name: 'Conceptspace',
    role: 'Statements & beliefs',
    description: 'Browse and support statements as beliefs or goals on-chain.',
    domain: 'conceptspace',
    path: '/',
    kind: 'statements',
  },
  {
    id: 'alignment',
    name: 'Alignment boards',
    role: 'Projects aligned to a statement',
    description: 'See projects that claim alignment with a goal or belief.',
    domain: 'alignment',
    path: '/',
    kind: 'funding',
  },
  {
    id: 'tally',
    name: 'Tally',
    role: 'Counting support',
    description: 'Tallies and views over shared statements.',
    domain: 'tally',
    path: '/',
    kind: 'statements',
  },
  {
    id: 'civility',
    name: 'Civility',
    role: 'Example cause',
    description: 'A worked example of a focused cause vertical.',
    domain: 'civility',
    path: '/',
    kind: 'reference',
  },
  {
    id: 'common-sense-majority',
    name: 'Common Sense Majority',
    role: 'Example movement',
    description: 'Reference vertical composing signing, funding, and content.',
    domain: 'common-sense-majority',
    path: '/',
    kind: 'reference',
  },
  {
    id: 'commonality',
    name: 'Commonality',
    role: 'Thesis',
    description: 'Background on public-goods funding without a central owner.',
    domain: 'commonality',
    path: '/',
    kind: 'reference',
  },
]

export function toolHref(tool: OnlineTool): string {
  return getDomainUrl(tool.domain, tool.path, '#')
}
