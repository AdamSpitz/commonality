import { Box, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'

function getNoninflammatoryContractPath(address: string): string {
  return `/content/contracts/${address}`
}

export function NoninflammatoryCreatorsPage() {
  return (
    <CreatorsLandingPage
      title="Noninflammatory Content"
      description="Fund creators who can explain one side to the other without contempt, ad hominem attacks, or tribal bait. This domain keeps the shared content-funding base but frames it around bridge-building."
      secondaryDescription="Browse content by platform, open a channel to inspect active contracts and attested items, or verify your own channel to receive support for making politics less alienating."
      learnMoreLabel="Why this domain exists"
      learnMorePath="/about"
    />
  )
}

export function NoninflammatoryBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Bridge-Building Creators"
      description="Browse funded channels and content submitted under the noninflammatory framing. Attested items still use the shared registry, but this surface highlights creators trying to lower the temperature rather than farm engagement."
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
          This contract view keeps noninflammatory links on the bridge-building domain while reusing the shared contract and attestation infrastructure underneath.
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
        The point of this domain is not bland centrism. It is to reward content that makes a strong case without making the audience feel despised. The shared funding contracts come from Commonality, but this surface is explicitly about bridge-building under political pressure.
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
            Attestations shown on contract and channel views come from the shared content-funding base. The UI already exposes which attesters signed off on an item, and contract pages stay linked to their underlying attestation and funding state.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Built on Commonality
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            This domain is a focused surface built on Commonality&apos;s broader infrastructure.
          </Typography>
          <Typography component={RouterLink} to="/statements" variant="body2" sx={{ textDecoration: 'none' }}>
            Explore the underlying statement graph
          </Typography>
        </Paper>
      </Stack>
    </Box>
  )
}
