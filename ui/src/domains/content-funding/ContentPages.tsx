import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'
import { getDomainUrl } from '../domainUrls'

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

export function ContentFundingAboutPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        About Content Funding
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 780 }}>
        Content Funding lets readers reward articles, videos, posts, and channels they want more of. Supporters pool money around a creator or piece of work; if the channel owner verifies, the escrow pays out to the creator.
      </Typography>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Who this is for
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2">Readers and donors</Typography>
              <Typography variant="body2" color="text.secondary">
                Fund work you value — articles, videos, posts, or whole channels. Your money is held in escrow until the creator verifies, so you risk nothing if they never claim it.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Creators</Typography>
              <Typography variant="body2" color="text.secondary">
                Verify your channel and collect support that readers have already pooled for you. No application process, no gatekeepers.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Delegates</Typography>
              <Typography variant="body2" color="text.secondary">
                Route funding toward content that serves a cause or standard you care about, without having to evaluate every piece yourself.
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Example flow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You liked a YouTube essay and want more like it. You open a funding contract for that channel, pledge funds, share the claim link, and the channel owner verifies ownership. Once verified, the escrow can pay the creator instead of leaving supporters to guess where to send money.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How it relates to the other sites
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Content contracts are specialized assurance contracts built on Commonality funding infrastructure. Tally is where people inspect or sign the statements that content may be evaluated against.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Getting started
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/content" variant="contained">
              Browse content
            </Button>
            <Button component={RouterLink} to="/content/dashboard" variant="outlined">
              Creator dashboard
            </Button>
            <Button component="a" href={getDomainUrl('commonality', '/docs/key-ideas/content-funding', { fallbackHref: '#' })} variant="text">
              Read the deeper guide
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
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
