import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Local `services.sh --start` / `deploy-causestarter.sh` IPFS publish list.
// Temporary default is CauseStarter only (legacy eight-domain Vite builds
// dominate local start time). Restore every bundle with LOCAL_UI_DOMAINS=all.
// See workflow/local-development.md.
export const uiDomains = [
  'commonality',
  'lazyGiving',
  'alignment',
  'tally',
  'content-funding',
  'civility',
  'common-sense-majority',
  'conceptspace',
  'causestarter',
]

const DEFAULT_LOCAL_PUBLISH_DOMAINS = ['causestarter']

export function resolveLocalPublishDomains(env = process.env) {
  const raw = (env.LOCAL_UI_DOMAINS ?? 'causestarter').trim()
  if (!raw || raw === 'causestarter') {
    return [...DEFAULT_LOCAL_PUBLISH_DOMAINS]
  }
  if (raw === 'all') {
    return [...uiDomains]
  }
  const requested = raw.split(/[\s,]+/).filter(Boolean)
  const unknown = requested.filter((domain) => !uiDomains.includes(domain))
  if (unknown.length > 0) {
    throw new Error(`Unknown LOCAL_UI_DOMAINS value(s): ${unknown.join(', ')}`)
  }
  return requested
}

const localHostnames = {
  commonality: 'commonality.localhost',
  lazyGiving: 'lazygiving.localhost',
  alignment: 'alignment.localhost',
  tally: 'tally.localhost',
  'content-funding': 'content-funding.localhost',
  civility: 'civility.localhost',
  'common-sense-majority': 'common-sense-majority.localhost',
  conceptspace: 'conceptspace.localhost',
  causestarter: 'causestarter.localhost',
  noninflammatory: 'civility.localhost',
  csm: 'common-sense-majority.localhost',
}

export function getLocalHostname(domain) {
  const hostname = localHostnames[domain]
  if (!hostname) {
    throw new Error(`Unknown UI domain: ${domain}`)
  }
  return hostname
}

export function getDomainForLocalHost(hostHeader = '') {
  const host = hostHeader.toLowerCase().split(':')[0]
  return uiDomains.find(domain => host === getLocalHostname(domain)) || null
}

export function getLocalStableUrl(domain, port) {
  return `http://${getLocalHostname(domain)}:${port}/#/`
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain && process.argv[2] === 'list-local-publish') {
  for (const domain of resolveLocalPublishDomains()) {
    console.log(domain)
  }
}
