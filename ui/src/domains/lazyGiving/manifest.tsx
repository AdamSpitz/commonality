import type { ReactNode } from 'react'
import { Route, Navigate } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { LazyGivingLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<LazyGivingLandingPage />} />
    <Route path="/projects" element={lazyRoute(() => import('../../lazyGiving/pages/BrowseProjectsPage'), 'BrowseProjectsPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('../../lazyGiving/pages/CreateProjectPage'), 'CreateProjectPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('../../lazyGiving/pages/ProjectDetailPage'), 'ProjectDetailPage')} />
    <Route path="/delegation" element={<Navigate to="/delegation/notes" replace />} />
    <Route path="/delegation/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/delegation/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/delegation/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/delegates/:address" element={lazyRoute(() => import('../../delegation/pages/DelegateProfilePage'), 'DelegateProfilePage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const lazyGivingManifest: DomainManifest = {
  id: 'lazyGiving',
  branding: {
    name: 'LazyGiving',
    tagline: 'Kickstarter for public goods.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Projects', path: '/projects' },
      { label: 'Start a Project', path: '/projects/new' },
      { label: 'Docs', path: '/docs' },
      { label: 'Delegation', path: '/delegation/notes' }
    ],
    secondaryNavigation: [],
    footerText: 'LazyGiving helps people create and fund individual public-goods projects with pledge-and-refund assurance contracts.',
  },
  features: {
    conceptspace: false,
    lazyGiving: true,
    fundingportal: false,
    delegation: true,
    mutablerefs: false,
    contentFunding: false,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: LazyGivingLandingPage,
}
