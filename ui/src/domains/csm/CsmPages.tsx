import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'
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
      description="Noninflammatory content is the movement's main wedge: fund media that helps people realize a broad, common-sense position already exists."
      secondaryDescription="Browse channels and funded content, or verify your own channel to start receiving support for work that makes the hidden majority visible."
      learnMoreLabel="How this movement works"
      learnMorePath="/about"
    />
  )
}

export function CsmBrowsePage() {
  return (
    <BrowseCreatorsPage
      title="Browse Hidden-Majority Content"
      description="Browse media that reveals broad agreement hiding behind the usual coalition noise. See which creators are funded, what contracts are active, and how much supporters have pledged."
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
          See who pledged, what content is covered, and how it helps surface hidden-majority positions. Creators can verify the channel here to claim pooled funds.
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
            Back concrete work that helps hidden majorities coordinate in public: canvassing, research, coalition-building, advocacy, and other organizing projects.
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
          Create a project for organizing, advocacy, research, or coordination work. Describe what you want to accomplish and why it matters to the movement.
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
          See who pledged, what milestones are planned, and how the project helps turn hidden-majority agreement into visible coordination.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}

export function CsmPopularStatementsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Popular CSM-related statements
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        These are starter statement prompts for the Common Sense Majority slice. Once the Tally statement lists are curated, this page can link directly to live statement pages and indirect-support counts.
      </Typography>
      <Stack spacing={2}>
        {[
          "Most people are reasonable; the loudest voices aren't representative.",
          'The country would be better off if normal people could see how much common ground already exists.',
          'I want political content that helps people disagree without despising each other.',
        ].map((statement) => (
          <Paper key={statement} sx={{ p: 2 }}>
            <Typography variant="body1">{statement}</Typography>
          </Paper>
        ))}
        <Button component={RouterLink} to="/organize" variant="contained" sx={{ alignSelf: 'flex-start' }}>
          View nudgers
        </Button>
      </Stack>
    </Box>
  )
}

export function CsmOrganizingPage() {
  return (
    <DomainLandingPage
      eyebrow="Organizing"
      title="Turn bridge-building content into visible, fundable political coordination."
      description="Use the playbook to connect persuasive media, Tally statement-signing, and concrete movement projects — without asking newcomers to understand the whole platform first."
      spotlights={[
        {
          label: 'Primary loop',
          text: 'Fund content that reveals common ground, sign statements on Tally to make the coalition visible, then back organizing projects that act on the agreement you have surfaced.',
        },
      ]}
      heroActions={[
        { label: 'Browse movement content', path: '/content' },
        { label: 'Start a movement project', path: '/projects/new', variant: 'outlined' },
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
          description: 'Once a position is legible, fund outreach, coalition-building, research, and advocacy projects that turn agreement into action.',
          path: '/projects',
          cta: 'Browse organizing projects',
        },
        {
          eyebrow: 'Tally',
          title: 'Inspect the statement layer on Tally',
          description: 'The movement framing depends on claims that people can sign. Use Tally to inspect what the coalition is actually agreeing to.',
          href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
          cta: 'Open Tally statements',
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
        Discover how many other people independently share your common-sense positions — then organize content, signatures, and projects around that visible support. The common ground was always there; trust was the hard part.
      </Typography>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Who this is for
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2">The politically homeless</Typography>
              <Typography variant="body2" color="text.secondary">
                You feel isolated in your social circle because you are tired of the anger and want to engage honestly with people you disagree with. You want to see whether anyone else feels the same way — without joining a party or signing a petition.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Content creators</Typography>
              <Typography variant="body2" color="text.secondary">
                You produce media that reveals broad agreement hiding behind the usual coalition noise. You want funding for bridge-building work and a visible coalition to point to.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Organizers and delegates</Typography>
              <Typography variant="body2" color="text.secondary">
                You want to turn visible agreement into action — canvassing, research, coalition-building, advocacy — and you need a funding and signaling system that does not require capturing a centralized organization.
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
              • Sign statements in your own words on Tally and see direct plus indirect support counts add up.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Fund bridge-building content that makes hidden-majority positions emotionally believable.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Back organizing projects that turn visible agreement into concrete action.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Browse the organizing playbook to understand how content, signatures, and projects fit together.
            </Typography>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How signatures and support flow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You sign a statement in your own words — for example, &quot;I&apos;m tired of being told I&apos;m evil for disagreeing.&quot; The implication graph discovers that your statement points toward common ground shared by people who signed completely different wording. Your statement page shows direct signers plus indirect supporters: people who never coordinated, never compromised on wording, but were all independently saying the same thing. That number is itself the news.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Read the walkthrough
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            The walkthrough shows how scattered individuals sign statements in their own language, how the system discovers that they all point toward the same common ground, and how the resulting visibility creates the conditions for content and projects that nobody had to centrally organize.
          </Typography>
          <Button component="a" href={getDomainUrl('commonality', '/docs/use-case-walkthroughs/common-sense-majority', { fallbackHref: '#' })} size="small">
            Read the full walkthrough
          </Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            The 30-second pitch
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            You know why every moderate-majority movement fails? Not because moderates don&apos;t exist — but because both sides suspect the organizer is working for the other side, and they&apos;re usually right. We removed the organizer. It&apos;s a protocol: money on a blockchain, refereeing done by AI with open-source prompts you can read yourself. Nobody to capture, nothing to bribe.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            People sign statements in their own words — the AI reads what millions of people on opposite sides actually wrote and discovers they already agree on most things. A statement page shows &quot;50,000 direct signers, 2 million indirect supporters&quot; — people who never coordinated, never compromised on wording, but were all independently saying the same thing.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The common ground was always there. Trust was the hard part. That&apos;s what we solved.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How the pieces fit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Civility funds bridge-building media. Tally handles statement signing and indirect support counts. Alignment handles ongoing cause funding, while Pubstarter handles one-off organizing projects. Conceptspace provides the underlying statement, implication, attester, and trust infrastructure.
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
            <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '#' })} variant="text">
              Open Tally
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
