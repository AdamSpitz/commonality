import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'
import { getDomainUrl } from '../domainUrls'

function getNoninflammatoryContractPath(address: string): string {
  return `/content/contracts/${address}`
}

export function NoninflammatoryCreatorsPage() {
  return (
    <CreatorsLandingPage
      title="Noninflammatory Content"
      description="Fund creators who can explain one side to the other without contempt, ad hominem attacks, or tribal bait. Browse by platform, back work that lowers the temperature, and help creators collect what supporters have pooled."
      secondaryDescription="Open a channel to see active contracts and funded content, or verify your own channel to start receiving support for bridge-building work."
      learnMoreLabel="Why this domain exists"
      learnMorePath="/about"
    />
  )
}

export function NoninflammatoryBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Bridge-Building Creators"
      description="Browse channels and content that aim to lower the temperature rather than farm engagement. See which creators are funded, what contracts are active, and how much supporters have pledged."
    />
  )
}

export function NoninflammatoryChannelPage() {
  return (
    <ChannelPage
      campaignHeading="Noninflammatory Contracts"
      createCampaignLabel="Create Noninflammatory Contract"
      emptyCampaignState="No noninflammatory contracts exist for this channel yet."
      unclaimedHeroDescription="Supporters have already pooled funds for content from this channel that helps people on opposite sides hear each other. If you are the creator, verify ownership to claim the escrow and manage future contracts."
      shareHeading="Invite the creator in"
      shareDescription="If this creator is actually trying to build bridges, send them the claim link so they can verify the channel and start managing noninflammatory contracts directly."
      suggestedMessagePrefix="Hey! People have already pooled"
      contractPathForAddress={getNoninflammatoryContractPath}
    />
  )
}

export function NoninflammatoryCreateContractPage() {
  return (
    <CreateContractPage
      titlePrefix="Create Noninflammatory Contract"
      connectPrompt="Connect your wallet to create a noninflammatory content contract."
      contentItemsDescription="Add content that steelmans the other side, avoids contempt, and helps people engage without spiraling into the usual polarized sludge."
      contractDetailsDescription="These contract details are stored on IPFS and used to describe why this content is worth rewarding under the noninflammatory framing."
      createButtonLabel="Create Noninflammatory Contract"
      viewButtonLabel="View Contract"
      shareSuccessHeading="Share this creator claim link so the channel owner can collect funds and manage future bridge-building contracts:"
      unclaimedAlert="This channel is unclaimed, so this starts as a fan-funded noninflammatory contract. Funds stay in escrow until the creator verifies the channel."
      verifiedAlert="This channel is verified. Funds from this noninflammatory contract go directly to the creator."
      creatorControlledAlert="You control this channel, so you can create a first-party noninflammatory contract without the third-party minimum purchase."
      contractPathForAddress={getNoninflammatoryContractPath}
    />
  )
}

export function NoninflammatoryCreatorDashboardPage() {
  return (
    <CreatorDashboardPage
      title="Creator Dashboard"
      description="Verify channels, withdraw escrowed balances, and manage noninflammatory contracts that supporters have opened around your content."
      connectPrompt="Connect your wallet to manage your bridge-building content channels."
      emptyState="No eligible channels found yet. Verify a channel to start receiving support for noninflammatory work."
    />
  )
}

export function NoninflammatoryContractPage() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Noninflammatory Contract
        </Typography>
        <Typography variant="body1" color="text.secondary">
          See who pledged, what content is covered, and why it was submitted under the bridge-building standard. Creators can verify the channel here to claim pooled funds.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}

export function NoninflammatoryAboutPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        About Noninflammatory Content
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        The point is not bland centrism. It is to reward content that makes a strong case without making the audience feel despised. You can back specific work, creators can claim what you pooled, and the claims behind the content live on Tally.
      </Typography>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            What gets rewarded
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Content that steelmans the other side, avoids contempt and ad hominem shortcuts, resists tribal signaling, and tries to persuade rather than inflame.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How attestation works today
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Attesters evaluate dimensions such as steelmanning, contempt, ad hominem shortcuts, tribal signaling, and emotional manipulation. The intended model is transparent by default: neutral, left-leaning, and right-leaning attester personas can all publish reasoning, and users choose whose judgments to trust.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Concrete example
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            A passing piece might explain why immigration enforcement matters to conservatives while still making immigrants feel human. A failing piece might have true facts but lean on mockery, contempt, or cheap outgroup cues that make the other side stop listening.
          </Typography>
          <Button component="a" href={getDomainUrl('commonality', '/docs/use-case-walkthroughs/noninflammatory-content', { fallbackHref: '#' })} size="small">
            Read the walkthrough
          </Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How this site relates to the others
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Noninflammatory Content uses the same funding flows as Content Funding. When you want to inspect or sign the claims behind the content, use Tally.
          </Typography>
          <Typography component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '#' })} variant="body2" sx={{ textDecoration: 'none' }}>
            Explore statements on Tally
          </Typography>
        </Paper>
      </Stack>
    </Box>
  )
}
