import type { ReactNode } from 'react'

export interface DomainBranding {
  name: string
  tagline: string
}

export interface DomainNavigationItem {
  label: string
  path: string
}

export interface DomainShellConfig {
  primaryNavigation: DomainNavigationItem[]
  secondaryNavigation: DomainNavigationItem[]
  footerText: string
}

export interface DomainFeatures {
  conceptspace: boolean
  pubstarter: boolean
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

export type DomainId = 'commonality' | 'tally' | 'content-funding' | 'noninflammatory' | 'csm' | 'conceptspace'
