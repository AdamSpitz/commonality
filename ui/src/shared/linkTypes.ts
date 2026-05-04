export type InternalLinkTarget = {
  path: string
  href?: never
}

export type ExternalLinkTarget = {
  href: string
  path?: never
}

export type LinkTarget = InternalLinkTarget | ExternalLinkTarget

export type LabeledLinkTarget = LinkTarget & {
  label: string
}

export function isExternalLinkTarget(link: LinkTarget): link is ExternalLinkTarget {
  return 'href' in link
}

export function getLinkHref(link: LinkTarget): string {
  return isExternalLinkTarget(link) ? link.href : link.path
}

export function getLinkKey(link: LinkTarget, label: string): string {
  return `${getLinkHref(link)}:${label}`
}
