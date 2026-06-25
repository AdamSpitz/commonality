export type InternalLinkTarget = {
  path: string
  href?: never
  domain?: never
}

export type ExternalLinkTarget = {
  href: string
  path?: never
  domain?: never
}

export type CrossDomainLinkTarget = {
  domain: string
  path?: string
  href?: never
}

export type LinkTarget = InternalLinkTarget | ExternalLinkTarget | CrossDomainLinkTarget

export type LabeledLinkTarget = LinkTarget & {
  label: string
}

export function isExternalLinkTarget(link: LinkTarget): link is ExternalLinkTarget {
  return 'href' in link && link.href !== undefined
}

export function isCrossDomainLinkTarget(link: LinkTarget): link is CrossDomainLinkTarget {
  return 'domain' in link && link.domain !== undefined
}

/** Returns the href/path string without domain resolution. For full resolution use resolveLinkHref from domainUrls. */
export function getLinkHref(link: LinkTarget): string {
  if (isExternalLinkTarget(link)) return link.href
  if (isCrossDomainLinkTarget(link)) return link.path ?? '#'
  return link.path
}

export function getLinkKey(link: LinkTarget, label: string): string {
  const key = isExternalLinkTarget(link) ? link.href : isCrossDomainLinkTarget(link) ? `${link.domain}:${link.path ?? '/'}` : link.path
  return `${key}:${label}`
}
