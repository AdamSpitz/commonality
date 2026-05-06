import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { DelegationLandingPage } from './LandingPage'
import { DelegationSupportedSitesPage } from './SupportedSitesPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<DelegationLandingPage />} />
    <Route path="/supported-sites" element={<DelegationSupportedSitesPage />} />
    <Route path="/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
  </>
)

export const delegationManifest: DomainManifest = {
  id: 'delegation',
  branding: {
    name: 'Delegation',
    tagline: 'Trusted judgment for public-goods funding.',
  },
  shell: {
    primaryNavigation: [
      { label: 'My Delegated Funds', path: '/notes' },
      { label: 'Delegate Money', path: '/notes/new' },
      {
        label: 'Cause Funding',
        get href() {
          return getDomainUrl('alignment', '/', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      { label: 'Supported Sites', path: '/supported-sites' },
      {
        label: 'Open Pubstarter',
        get href() {
          return getDomainUrl('pubstarter', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Open Content Funding',
        get href() {
          return getDomainUrl('content-funding', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Become a delegate',
        get href() {
          return getDomainUrl('commonality', '/docs/roles/become-a-delegate', { fallbackHref: '#' })
        },
      },
    ],
    footerText: 'Delegation helps donors route funding through people they trust while delegates build transparent public track records.',
  },
  features: {
    conceptspace: false,
    pubstarter: false,
    fundingportal: false,
    delegation: true,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: DelegationLandingPage,
}
