import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { AlignmentLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<AlignmentLandingPage />} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
  </>
)

export const alignmentManifest: DomainManifest = {
  id: 'alignment',
  branding: {
    name: 'Alignment',
    tagline: 'Ongoing cause funding through trusted judgment.',
  },
  shell: {
    primaryNavigation: [
      {
        label: 'Delegation',
        get href() {
          return getDomainUrl('delegation', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Statements on Tally',
        get href() {
          return getDomainUrl('tally', '/statements', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      {
        label: 'Pledge funds to a cause',
        get href() {
          return getDomainUrl('commonality', '/docs/roles/pledge-to-a-cause', { fallbackHref: '#' })
        },
      },
      {
        label: 'Set up delegation',
        get href() {
          return getDomainUrl('delegation', '/notes/new', { fallbackHref: '#' })
        },
      },
      {
        label: 'Open Pubstarter',
        get href() {
          return getDomainUrl('pubstarter', '/', { fallbackHref: '#' })
        },
      },
    ],
    footerText: 'Alignment helps donors fund causes through portals and transparent alignment attestations; delegation lives on the Delegation site.',
  },
  features: {
    conceptspace: false,
    pubstarter: false,
    fundingportal: true,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: AlignmentLandingPage,
}
