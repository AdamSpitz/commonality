import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { NoninflammatoryLandingPage } from './LandingPage'
import {
  NoninflammatoryAboutPage,
  NoninflammatoryBrowsePage,
  NoninflammatoryChannelPage,
  NoninflammatoryContractPage,
  NoninflammatoryCreateContractPage,
  NoninflammatoryCreatorDashboardPage,
  NoninflammatoryCreatorsPage,
} from './ContentPages'
import { BrowseStatementsPage } from '../../conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from '../../conceptspace/pages/StatementPage'
import { UserProfilePage } from '../../conceptspace/pages/UserProfilePage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<NoninflammatoryLandingPage />} />
    <Route path="/statements" element={<BrowseStatementsPage />} />
    <Route path="/statement/:statementCid" element={<StatementPage />} />
    <Route path="/profile" element={<UserProfilePage />} />
    <Route path="/user/:address" element={<UserProfilePage />} />
    <Route path="/content" element={<NoninflammatoryCreatorsPage />} />
    <Route path="/content/dashboard" element={<NoninflammatoryCreatorDashboardPage />} />
    <Route path="/content/contracts/:projectAddress" element={<NoninflammatoryContractPage />} />
    <Route path="/content/:platform" element={<NoninflammatoryBrowsePage />} />
    <Route path="/content/:platform/:channelId" element={<NoninflammatoryChannelPage />} />
    <Route path="/content/:platform/:channelId/new" element={<NoninflammatoryCreateContractPage />} />
    <Route path="/about" element={<NoninflammatoryAboutPage />} />
  </>
)

export const noninflammatoryManifest: DomainManifest = {
  id: 'noninflammatory',
  branding: {
    name: 'Noninflammatory Content',
    tagline: 'Build bridges, not walls.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Content', path: '/content' },
      { label: "I'm a Creator", path: '/content/dashboard' },
      { label: 'Statements', path: '/statements' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'About', path: '/about' },
    ],
    footerText: 'Noninflammatory Content rewards creators who communicate across divides.',
  },
  features: {
    conceptspace: true,
    pubstarter: false,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: true,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: NoninflammatoryLandingPage,
}
