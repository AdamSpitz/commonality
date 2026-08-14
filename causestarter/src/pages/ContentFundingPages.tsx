/**
 * CauseStarter host for the shared Content Funding feature pages.
 * Routes match the content-funding domain so imported widgets keep working.
 */
import { CreatorsLandingPage } from '@ui/content-funding/pages/CreatorsLandingPage'

export {
  ContentFundingAboutPage,
  ContentFundingBrowsePage,
  ContentFundingChannelPage,
  ContentFundingContractPage,
  ContentFundingCreateContractPage,
  ContentFundingCreatorDashboardPage,
  ContentFundingExploreKindsPage,
  ContentFundingMaterializeFutureContentPage,
  ContentFundingStartContractPage,
} from '@ui/domains/content-funding/ContentPages'

export { ContentFundingLandingPage } from '@ui/domains/content-funding/LandingPage'

export function ContentFundingCreatorsPage() {
  return (
    <CreatorsLandingPage
      title="Content Funding"
      description="Fund creators and individual pieces of content people already value. Browse by platform, back work you care about, and let creators claim what contributors have pooled for them."
      secondaryDescription="Open a channel to see active contracts and escrowed funds, or create a new contract around content you want to reward."
      learnMoreLabel="Learn how content funding contracts work"
      learnMorePath="/content-funding/about"
    />
  )
}
