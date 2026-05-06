import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { CsmLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<CsmLandingPage />} />
    <Route path="/about" element={lazyRoute(() => import('./CsmPages'), 'CsmAboutPage')} />
    <Route path="/organize" element={lazyRoute(() => import('./CsmPages'), 'CsmOrganizingPage')} />
    <Route path="/popular-statements" element={lazyRoute(() => import('./CsmPages'), 'CsmPopularStatementsPage')} />
    <Route path="/content" element={lazyRoute(() => import('./CsmPages'), 'CsmCreatorsPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('./CsmPages'), 'CsmCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('./CsmPages'), 'CsmContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('./CsmPages'), 'CsmBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('./CsmPages'), 'CsmChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('./CsmPages'), 'CsmCreateContractPage')} />
    <Route path="/projects" element={lazyRoute(() => import('./CsmPages'), 'CsmProjectsPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('./CsmPages'), 'CsmCreateProjectPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('./CsmPages'), 'CsmProjectDetailPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
  </>
)

export const csmManifest: DomainManifest = {
  id: 'csm',
  branding: {
    name: 'Common Sense Majority',
    tagline: 'The hidden majority finds its voice.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Organize', path: '/organize' },
      { label: 'Browse Content', path: '/content' },
      { label: 'Projects', path: '/projects' },
      {
        label: 'Statements on Tally',
        get href() {
          return getDomainUrl('tally', '/statements', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      { label: 'About the movement', path: '/about' },
      { label: 'Popular Statements', path: '/popular-statements' },
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'Start a Project', path: '/projects/new' },
    ],
    footerText: 'Common Sense Majority organizes the hidden majority around common-sense positions.',
  },
  features: {
    conceptspace: false,
    pubstarter: true,
    fundingportal: true,
    delegation: false,
    mutablerefs: false,
    contentFunding: true,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: CsmLandingPage,
}
