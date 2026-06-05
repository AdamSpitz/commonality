export const uiDomains = [
  'commonality',
  'lazyGiving',
  'alignment',
  'tally',
  'content-funding',
  'civility',
  'common-sense-majority',
  'conceptspace',
]

const localHostnames = {
  commonality: 'commonality.localhost',
  lazyGiving: 'lazygiving.localhost',
  alignment: 'alignment.localhost',
  tally: 'tally.localhost',
  'content-funding': 'content-funding.localhost',
  civility: 'civility.localhost',
  'common-sense-majority': 'common-sense-majority.localhost',
  conceptspace: 'conceptspace.localhost',
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
