import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { BrowseProjectsPage } from '../../pubstarter/pages/BrowseProjectsPage'
import { CreateProjectPage } from '../../pubstarter/pages/CreateProjectPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'

function getCsmContractPath(address: string): string {
  return `/content/contracts/${address}`
}

export function CsmCreatorsPage() {
  return (
    <CreatorsLandingPage
      title="Movement Content"
      description="Noninflammatory content is the movement's main wedge. This surface reuses the shared content-funding machinery but frames it around revealing common-sense positions that broad majorities already share."
      secondaryDescription="Browse channels and funded content, inspect attestation-backed bridge-building work, or verify your own channel to turn persuasive media into movement infrastructure."
      learnMoreLabel="How this movement surface works"
      learnMorePath="/about"
    />
  )
}

export function CsmBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Hidden-Majority Content"
      description="These creator and content flows still run on the shared content-funding base, but this surface emphasizes media that reveals broad agreement hiding behind coalition noise."
    />
  )
}

export function CsmChannelPage() {
  return (
    <ChannelPage
      campaignHeading="Movement Content Contracts"
      createCampaignLabel="Fund Movement Content"
      emptyCampaignState="No movement content contracts exist for this channel yet."
      unclaimedHeroDescription="Supporters have already pooled funds for content from this channel that can surface hidden-majority positions. If you are the creator, verify ownership to claim the escrow and steer future movement-aligned contracts."
      shareHeading="Bring this creator into the movement"
      shareDescription="If this creator is good at explaining one side to the other, send them the claim link so they can verify the channel and manage future movement content contracts directly."
      suggestedMessagePrefix="Hey! People have already pooled"
      contractPathForAddress={getCsmContractPath}
    />
  )
}

export function CsmCreateContractPage() {
  return (
    <CreateContractPage
      titlePrefix="Create Movement Content Contract"
      connectPrompt="Connect your wallet to create a movement content contract for this channel."
      contentItemsDescription="Add the posts, videos, or essays that can make a hidden majority visible by explaining a position without contempt, cheap tribal cues, or needless escalation."
      contractDetailsDescription="These contract details are stored on IPFS and explain why the funded content helps organize around a common-sense majority."
      createButtonLabel="Create Movement Contract"
      viewButtonLabel="View Movement Contract"
      shareSuccessHeading="Share this creator claim link so the channel owner can claim the funds and manage future movement contracts:"
      unclaimedAlert="This channel is unclaimed, so this starts as a supporter-opened movement content contract. Funds stay in escrow until the creator verifies the channel."
      verifiedAlert="This channel is verified. Funds from this movement content contract go directly to the creator."
      creatorControlledAlert="You control this channel, so you can create a first-party movement content contract without the third-party minimum purchase."
      contractPathForAddress={getCsmContractPath}
    />
  )
}

export function CsmCreatorDashboardPage() {
  return (
    <CreatorDashboardPage
      title="Movement Creator Dashboard"
      description="Verify channels, manage escrowed balances, and track bridge-building contracts that help surface hidden-majority positions."
      connectPrompt="Connect your wallet to manage movement content channels."
      emptyState="No eligible movement content channels found yet. Verify a channel to start receiving support for bridge-building work."
    />
  )
}

export function CsmContractPage() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Movement Content Contract
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This contract view keeps movement-focused content links on the Common Sense Majority surface while reusing the same funding, attestation, and payout infrastructure underneath.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}

export function CsmProjectsPage() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4" component="h1">
            Organizing Projects
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Use Commonality&apos;s shared pubstarter infrastructure for movement work: canvassing, research, coalition-building, advocacy, and other projects that help hidden majorities coordinate in public.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/projects/new" variant="contained">
              Start a movement project
            </Button>
            <Button component={RouterLink} to="/organize" variant="outlined">
              See the organizing playbook
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <BrowseProjectsPage />
    </Box>
  )
}

export function CsmCreateProjectPage() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Start a Movement Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create a project for organizing, advocacy, research, or coordination work. The contract machinery is shared with Commonality, but this framing keeps the ask tied to movement outcomes instead of generic project funding.
        </Typography>
      </Paper>
      <CreateProjectPage />
    </Box>
  )
}

export function CsmProjectDetailPage() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Movement Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This project view keeps organizing work in the Common Sense Majority frame while reusing the shared project contract, marketplace, and attestation components.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}

export function CsmOrganizingPage() {
  return (
    <DomainLandingPage
      eyebrow="Organizing"
      title="Turn bridge-building content into visible, fundable political coordination."
      description="Common Sense Majority sits between the narrow noninflammatory content tool and the full Commonality platform. Use this surface to connect persuasive media, explicit statements, and concrete movement projects."
      spotlightLabel="Primary loop"
      spotlightText="Fund content that reveals common ground, trace that content back to statements people can sign, then fund organizing projects that act on the coalition you have made visible."
      heroActions={[
        { label: 'Browse movement content', path: '/content' },
        { label: 'Start a movement project', path: '/projects/new', variant: 'outlined' },
        { label: 'Explore statements', path: '/statements', variant: 'text' },
      ]}
      sections={[
        {
          eyebrow: 'Content',
          title: 'Surface hidden-majority positions',
          description: 'Noninflammatory content is the main discovery mechanism: it shows people that agreement exists across the usual coalition boundaries.',
          path: '/content',
          cta: 'Browse movement content',
        },
        {
          eyebrow: 'Funding',
          title: 'Back organizing work',
          description: 'Once a position is legible, use the shared pubstarter layer to fund outreach, coalition-building, research, and advocacy around it.',
          path: '/projects',
          cta: 'Browse organizing projects',
        },
        {
          eyebrow: 'Claims',
          title: 'Inspect the statement layer',
          description: 'The movement framing depends on claims that people can sign. Use the statement graph to inspect what the coalition is actually agreeing to.',
          path: '/statements',
          cta: 'Inspect statements',
        },
      ]}
    />
  )
}

export function CsmAboutPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        About Common Sense Majority
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        This domain is the movement layer in the multiple-domain UI plan. It reuses Noninflammatory Content as the main media mechanism and Commonality as the underlying statement and funding infrastructure, while keeping the surface focused on organizing around common-sense positions.
      </Typography>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            What this surface is for
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing that broad agreement exists, funding the content that makes that agreement legible, and backing concrete projects that help people organize around it.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            What this surface is not
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It is not the full Commonality platform, and it is not only a content tool. The goal is a middle layer: broad enough for movement work, narrow enough to stay legible.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Start organizing
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/organize" variant="contained">
              Open the organizing playbook
            </Button>
            <Button component={RouterLink} to="/content" variant="outlined">
              Browse movement content
            </Button>
            <Button component={RouterLink} to="/projects" variant="text">
              Browse projects
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
