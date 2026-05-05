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
      description="Fund creators and individual pieces of content people already value. Browse by platform, back work you care about, and let creators claim what supporters have pooled for them."
      secondaryDescription="Open a channel to see active contracts and escrowed funds, or create a new contract around content you want to reward."
      learnMoreLabel="Learn how content funding contracts work"
    />
  )
}

export function ContentFundingBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Fundable Creators"
      description="Find creators on Twitter, YouTube, and Substack. Each channel shows active funding contracts, how much supporters have pooled, and the specific posts or videos tied to those contracts."
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
      contentItemsDescription="Add the posts, videos, or essays you want this contract to cover. Keep the description focused on why the work deserves support."
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
        Reward articles, videos, posts, and channels you want more of. Supporters pool money around a creator or piece of work; if the channel owner verifies, the escrow pays out to the creator.
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
            What you can do here
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              • Browse creators by platform and open a funding contract around a channel or specific piece of content.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Pledge funds that stay in escrow until the creator verifies ownership and claims them.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Share a claim link with the creator so they can verify and collect what supporters have pooled.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • If you are the creator, verify your channel and withdraw escrowed balances from one dashboard.
            </Typography>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How money flows
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A supporter pledges funds into an escrow contract tied to a specific channel or content item. The creator verifies ownership through the platform API. Once verified, the creator can withdraw the pooled balance. If the creator never shows up, supporters can reclaim their pledge.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Concrete example
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            You liked a YouTube essay and want more like it. You open a funding contract for that channel, pledge funds, and share the claim link. The channel owner verifies ownership and collects the escrow — instead of leaving supporters to guess where to send money.
          </Typography>
          <Button component="a" href={getDomainUrl('commonality', '/docs/use-case-walkthroughs/noninflammatory-content', { fallbackHref: '#' })} size="small">
            Read the full walkthrough
          </Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Do I need crypto?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Today, pledging and withdrawing use cryptocurrency wallets. Credit-card and fiat on-ramps are on the roadmap. If you are a creator who does not use crypto, you can still verify your channel and leave the funds in escrow until fiat withdrawals are available — or have a crypto-savvy friend help you claim.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How this site relates to the other sites
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Content Funding uses Pubstarter-style escrow and payout contracts specialized for creators and content items, with channel verification handled by the platform API. Tally is where people inspect or sign the statements that content may be evaluated against.
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
          See who pledged, what content is covered, and where the escrow stands. Creators can verify the channel here to claim pooled funds.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}
