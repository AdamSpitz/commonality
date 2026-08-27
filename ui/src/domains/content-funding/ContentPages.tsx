import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { MaterializeFutureContentPage } from '../../content-funding/pages/MaterializeFutureContentPage'
import { ProjectDetailPage } from '../../lazy-giving/pages/ProjectDetailPage'
import { usePlatformApi } from '../../content-funding/hooks/usePlatformApi'
import { getDomainUrl } from '../../shared'
import { contentContractPathForAddress } from '../../shared'

function getContentFundingContractPath(address: string): string {
  return contentContractPathForAddress(address)
}

interface ContentFundingCreatorsPageProps {
  learnMorePath?: string
}

export function ContentFundingCreatorsPage({
  learnMorePath,
}: ContentFundingCreatorsPageProps = {}) {
  return (
    <CreatorsLandingPage
      title="Content Funding"
      description="Fund creators and individual pieces of content people already value. Browse by platform, back work you care about, and let creators claim what contributors have pooled for them."
      secondaryDescription="Open a channel to see active contracts and escrowed funds, or create a new contract around content you want to reward."
      learnMoreLabel="Learn how content funding contracts work"
      learnMorePath={learnMorePath}
    />
  )
}

export function CauseStarterContentFundingCreatorsPage() {
  return <ContentFundingCreatorsPage learnMorePath="/content-funding/about" />
}

export function ContentFundingBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Fundable Creators"
      description="Find creators on Twitter, YouTube, and Substack. Each channel shows active funding contracts, how much contributors have pooled, and the specific posts or videos tied to those contracts."
    />
  )
}

export function ContentFundingChannelPage() {
  return (
    <ChannelPage
      contractsHeading="Content Funding Contracts"
      createContractLabel="Start Contract"
      emptyContractsState="No content-funding contracts exist for this channel yet."
      unclaimedHeroDescription="This creator has not claimed the channel yet. If it is yours, verify your identity and claim the escrowed funds contributors have already pooled here."
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

export function ContentFundingMaterializeFutureContentPage() {
  return <MaterializeFutureContentPage />
}

export function ContentFundingCreatorDashboardPage() {
  return (
    <CreatorDashboardPage
      title="Creator Funding Dashboard"
      description="Manage claimed channels, withdraw escrowed balances, and review active or vetoable contracts tied to your content."
      connectPrompt="Connect your wallet to manage creator funding contracts."
      emptyState="No eligible creator channels found for this wallet yet. Verify a channel by starting a contract for your channel or pasting a content URL from the Content Funding start page."
    />
  )
}

interface ContentStartTarget {
  platform: 'twitter' | 'youtube' | 'substack'
  handle: string
}

function inferContentStartTarget(rawUrl: string): ContentStartTarget | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    const pathParts = url.pathname.split('/').filter(Boolean)

    if ((host === 'twitter.com' || host === 'x.com') && pathParts[0]) {
      return { platform: 'twitter', handle: pathParts[0] }
    }
    if ((host === 'youtube.com' || host === 'm.youtube.com') && pathParts[0]?.startsWith('@')) {
      return { platform: 'youtube', handle: pathParts[0] }
    }
    if (host.endsWith('substack.com')) {
      const handle = host.replace(/\.substack\.com$/, '')
      return handle ? { platform: 'substack', handle } : null
    }
  } catch {
    return null
  }

  return null
}

export function ContentFundingStartContractPage() {
  const [contentUrl, setContentUrl] = useState('')
  const [startError, setStartError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { resolveChannel, isLoading } = usePlatformApi()

  const startFromUrl = async () => {
    const target = inferContentStartTarget(contentUrl)
    if (!target) {
      setStartError('Enter an X, YouTube, or Substack creator or content URL.')
      return
    }

    setStartError(null)
    try {
      const resolved = await resolveChannel(target.platform, target.handle)
      navigate(`/content/${target.platform}/${encodeURIComponent(resolved.channelId)}`)
    } catch (error) {
      setStartError(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'We could not resolve that creator. Check the URL and try again.')
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create a content contract
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Paste a creator, channel, or content URL and we will take you to the right channel page to start the contract. Content contracts need a claimable X, YouTube, or Substack channel so the creator can collect the funds.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, maxWidth: 760 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Start from a content URL</Typography>
          <TextField
            label="Creator, channel, or content URL"
            placeholder="https://x.com/creator/status/..."
            value={contentUrl}
            onChange={(event) => setContentUrl(event.target.value)}
            fullWidth
          />
          {startError && <Alert severity="error">{startError}</Alert>}
          <Button onClick={startFromUrl} variant="contained" disabled={isLoading} sx={{ alignSelf: 'flex-start' }}>
            {isLoading ? 'Finding creator…' : 'Continue to contract setup'}
          </Button>
        </Stack>
      </Paper>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button component={RouterLink} to="/content/twitter" variant="outlined">Browse X creators</Button>
        <Button component={RouterLink} to="/content/youtube" variant="outlined">Browse YouTube creators</Button>
        <Button component={RouterLink} to="/content/substack" variant="outlined">Browse Substack creators</Button>
      </Stack>
    </Box>
  )
}

export function ContentFundingExploreKindsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Explore kinds of content
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Content contracts here are organized around creators and channels. If you want statement- or cause-centric browsing, use Aligning; these examples are just common kinds of content contributors may fund.
      </Typography>
      <Stack spacing={2}>
        {['Funny', 'Educational', 'Investigative', 'Noninflammatory'].map((kind) => (
          <Paper key={kind} sx={{ p: 2 }}>
            <Typography variant="h6">{kind}</Typography>
            <Typography variant="body2" color="text.secondary">
              Fund creator/channel contracts for this kind of work here, or use Aligning when you want a fundable-projects board organized around a statement.
            </Typography>
          </Paper>
        ))}
        <Button component={RouterLink} to="/content/new" variant="contained" sx={{ alignSelf: 'flex-start' }}>
          Create a content contract
        </Button>
      </Stack>
    </Box>
  )
}

export function ContentFundingAboutPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        About Content Funding
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 780 }}>
        Reward articles, videos, posts, and channels you want more of. Contributors pool money around a creator or piece of work; if the channel owner verifies, the escrow pays out to the creator.
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
              • Contribute funds that stay in escrow until the creator verifies ownership and claims them.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Share a claim link with the creator so they can verify and collect what contributors have pooled.
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
            A contributor puts funds into an escrow contract tied to a specific channel or content item. The creator verifies ownership through the platform API. Once verified, the creator can withdraw the pooled balance. If the creator never shows up, contributors can reclaim their contribution.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Concrete example
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            You liked a YouTube essay and want more like it. You open a funding contract for that channel, contribute funds, and share the claim link. The channel owner verifies ownership and collects the escrow — instead of leaving contributors to guess where to send money.
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
            Content Funding uses LazyGiving-style escrow and payout contracts specialized for creators and content items, with channel verification handled by the platform API. It is organized around channels and contracts; for statement- or cause-centric fundable-projects boards, use Aligning. Tally is where people inspect or sign statements.
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
            <Button component={RouterLink} to="/docs/content-funding/content-funding" variant="text">
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
          See who contributed, what content is covered, and where the escrow stands. Creators can verify the channel here to claim pooled funds.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}
