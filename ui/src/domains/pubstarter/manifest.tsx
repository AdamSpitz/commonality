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
    ],
    footerText: 'Pubstarter helps people create and fund individual public-goods projects with pledge-and-refund assurance contracts.',
  },
  features: {
    conceptspace: false,
    pubstarter: true,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: PubstarterLandingPage,
}
