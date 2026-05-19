import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { PubstarterLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<PubstarterLandingPage />} />
    <Route path="/projects" element={lazyRoute(() => import('../../pubstarter/pages/BrowseProjectsPage'), 'BrowseProjectsPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('../../pubstarter/pages/CreateProjectPage'), 'CreateProjectPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('../../pubstarter/pages/ProjectDetailPage'), 'ProjectDetailPage')} />
    <Route path="/delegation" element={lazyRoute(() => import('../delegation/LandingPage'), 'DelegationLandingPage')} />
    <Route path="/delegation/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/delegation/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/delegation/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/delegates/:address" element={lazyRoute(() => import('../../delegation/pages/DelegateProfilePage'), 'DelegateProfilePage')} />
  </>
)

export const pubstarterManifest: DomainManifest = {
  id: 'pubstarter',
  branding: {
    name: 'Pubstarter',
    tagline: 'Kickstarter for public goods.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Projects', path: '/projects' },
      { label: 'Start a Project', path: '/projects/new' },
      {
        label: 'Cause Funding',
        get href() {
          return getDomainUrl('alignment', '/', { fallbackHref: '#' })
        },
      },
      { label: 'Delegation', path: '/delegation/notes' }
    ],
    secondaryNavigation: [
      {
        label: 'How project funding works',
        get href() {
          return getDomainUrl('commonality', '/docs/roles/fund-something', { fallbackHref: '#' })
        },
      },
      {
        label: 'Get your project funded',
        get href() {
          return getDomainUrl('commonality', '/docs/roles/get-your-project-funded', { fallbackHref: '#' })
        },
      },
      { label: 'Delegate funding decisions', path: '/delegation' }
    ],
    footerText: 'Pubstarter helps people create and fund individual public-goods projects with pledge-and-refund assurance contracts.',
  },
  features: {
    conceptspace: false,
    pubstarter: true,
    fundingportal: false,
    delegation: true,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: PubstarterLandingPage,
}
