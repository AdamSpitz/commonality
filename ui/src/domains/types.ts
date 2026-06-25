import type { ReactNode } from 'react'
import type { LabeledLinkTarget } from '../shared'

export interface DomainBranding {
  name: string
  tagline: string
}

export type DomainNavigationItem = LabeledLinkTarget

export interface DomainShellConfig {
  primaryNavigation: DomainNavigationItem[]
  secondaryNavigation: DomainNavigationItem[]
  footerText: string
}

export interface DomainFeatures {
  conceptspace: boolean
  lazyGiving: boolean
  fundingportal: boolean
  delegation: boolean
  mutablerefs: boolean
  contentFunding: boolean
  docs: boolean
}

export interface DomainManifest {
  id: string
  branding: DomainBranding
  shell: DomainShellConfig
  features: DomainFeatures
  basePath: string
  routes: ReactNode
  LandingPage?: () => ReactNode
}

// `DomainId` lives in `shared/routing/domainUrls` (cross-brand URL resolution is a cross-cutting
// concern needed by feature modules too); re-exported here for the domain-layer consumers.
export type { DomainId } from '../shared'
