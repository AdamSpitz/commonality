import type { ComponentType, ReactNode } from 'react'
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

export interface DomainManifest {
  id: string
  branding: DomainBranding
  shell: DomainShellConfig
  basePath: string
  routes: ReactNode
  LandingPage?: () => ReactNode
  /** Optional domain-owned chrome; other domains use the shared AppShell. */
  Shell?: ComponentType<{ children: ReactNode }>
}

// `DomainId` lives in `shared/routing/domainUrls` (cross-brand URL resolution is a cross-cutting
// concern needed by feature modules too); re-exported here for the domain-layer consumers.
export type { DomainId } from '../shared'
