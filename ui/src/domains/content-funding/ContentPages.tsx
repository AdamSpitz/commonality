import { Box, Paper, Typography } from '@mui/material'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'

function getContentFundingContractPath(address: string): string {
  return `/content/contracts/${address}`
}

export function ContentFundingCreatorsPage() {
  return (
    <CreatorsLandingPage
      title="Content Funding"
      description="Fund creators and individual pieces of content people already value. The underlying contract flow uses Commonality's funding infrastructure, but this surface stays focused on discoverability, funding, and creator payouts."
      secondaryDescription="Browse Twitter, YouTube, and Substack creators by platform, then open a channel to back specific work or create a new contract around it."
      learnMoreLabel="Learn how content funding contracts work"
    />
  )
}

export function ContentFundingBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Fundable Creators"
      description="Browse the shared content-funding registry by platform. Each channel view shows active contracts, escrowed funds, and the content items already tied to those contracts."
    />
  )
}

export function ContentFundingChannelPage() {
  return (
    <ChannelPage
      campaignHeading="Content Funding Contracts"
      createCampaignLabel="Start Contract"
      emptyCampaignState="No content-funding contracts exist for this channel yet."
      unclaimedHeroDescription="This creator has not claimed the channel yet. If it is yours, verify your identity and claim the escrowed funds supporters have already pooled here."
      shareDescription="If you know this creator, send them the claim link below so they can verify ownership and collect the funds waiting for them."
      contractPathForAddress={getContentFundingContractPath}
    />
  )
}

export function ContentFundingCreateContractPage() {
  return (
    <CreateContractPage
      titlePrefix="Create Content Funding Contract"
      connectPrompt="Connect your wallet to create a content-funding contract for this channel."
      contentItemsDescription="Add the posts, videos, or essays you want this contract to cover. The submission flow stays shared, but this surface keeps the framing focused on creator funding."
      createButtonLabel="Create Funding Contract"
      viewButtonLabel="View Contract"
      shareSuccessHeading="Share this claim link with the creator so they can collect their funds:"
      contractPathForAddress={getContentFundingContractPath}
    />
  )
}

export function ContentFundingCreatorDashboardPage() {
  return (
    <CreatorDashboardPage
      title="Creator Funding Dashboard"
      description="Manage claimed channels, withdraw escrowed balances, and review active or vetoable contracts tied to your content."
      connectPrompt="Connect your wallet to manage creator funding contracts."
      emptyState="No eligible creator channels found for this wallet yet. Verify a channel to start collecting funding directly."
    />
  )
}

export function ContentFundingContractPage() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Content Funding Contract
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This is the content-focused contract view for the Content Funding domain. It keeps contract links and channel cross-links inside this branded surface instead of sending people into the broader project browser.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}
