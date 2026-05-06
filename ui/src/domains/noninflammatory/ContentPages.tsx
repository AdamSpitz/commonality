import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
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
      title="Civility"
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
      campaignHeading="Civility Contracts"
      createCampaignLabel="Create Civility Contract"
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
      titlePrefix="Create Civility Contract"
      connectPrompt="Connect your wallet to create a noninflammatory content contract."
      contentItemsDescription="Add content that steelmans the other side, avoids contempt, and helps people engage without spiraling into the usual polarized sludge."
      contractDetailsDescription="These contract details are stored on IPFS and used to describe why this content is worth rewarding under the noninflammatory framing."
      createButtonLabel="Create Civility Contract"
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
          Civility Contract
        </Typography>
        <Typography variant="body1" color="text.secondary">
          See who pledged, what content is covered, and why it was submitted under the bridge-building standard. Creators can verify the channel here to claim pooled funds.
        </Typography>
      </Paper>
      <ProjectDetailPage />
    </Box>
  )
}

export function NoninflammatoryFiltersPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Popular filters
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Civility filters are statements about what a group would not find needlessly inflammatory. The full personalized filter explorer is still evolving; these are the starter filters the landing page is referring to.
      </Typography>
      <Stack spacing={2}>
        {[
          'I am on the left, but I would be glad to see right-wing content as long as it is not going to piss me off.',
          'I am on the right, but I would be glad to see left-wing content as long as it is not going to piss me off.',
          'I want content that steelmans the other side before arguing against it.',
        ].map((filter) => (
          <Paper key={filter} sx={{ p: 2 }}>
            <Typography variant="body1">{filter}</Typography>
          </Paper>
        ))}
        <Button component={RouterLink} to="/content" variant="contained" sx={{ alignSelf: 'flex-start' }}>
          Explore fundable content
        </Button>
      </Stack>
    </Box>
  )
}

export function NoninflammatoryPopularStatementsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Popular Civility-related statements
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        These are placeholder statement prompts for the Civility slice. Once the Tally statement lists are curated, this page can link directly to the live statement pages.
      </Typography>
      <Stack spacing={2}>
        {[
          "I'm tired of content that treats the other side as stupid or evil.",
          'I want to reward content that can be heard by people who disagree with it.',
          'A strong argument should not need contempt to land.',
        ].map((statement) => (
          <Paper key={statement} sx={{ p: 2 }}>
            <Typography variant="body1">{statement}</Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  )
}

export function NoninflammatoryNominatePage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Nominate noninflammatory content
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Nominations happen through content contracts: start from the creator or channel, add the post/video/article URLs, and describe why they meet the noninflammatory standard.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button component={RouterLink} to="/content/twitter" variant="contained">Browse X creators</Button>
        <Button component={RouterLink} to="/content/youtube" variant="outlined">Browse YouTube creators</Button>
        <Button component={RouterLink} to="/content/substack" variant="outlined">Browse Substack creators</Button>
      </Stack>
    </Box>
  )
}

export function NoninflammatoryAboutPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        About Civility
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Reward content that makes a strong case without making the audience feel despised. The point is not bland centrism — it is to fund writing and media that helps people on opposite sides actually hear each other.
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
                You are tired of polarized outrage bait and want to fund writing that communicates across divides. You can back specific pieces or channels, and your money stays in escrow until the creator verifies.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Creators</Typography>
              <Typography variant="body2" color="text.secondary">
                You write or produce content that steelmans the other side, avoids contempt, and invites engagement rather than defensiveness. Verify your channel and collect what supporters have already pooled for your work.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Delegates and taste-makers</Typography>
              <Typography variant="body2" color="text.secondary">
                You curate thoughtful political writing and want to direct pooled funds toward content that meets the bridge-building standard, without evaluating every submission yourself.
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
              • Browse bridge-building content across Twitter, YouTube, and Substack and open a funding contract around work you want to reward.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Pledge funds that stay in escrow until the creator verifies ownership and claims them.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • If you are the creator, verify your channel and withdraw escrowed balances from one dashboard.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Submit content for evaluation against the noninflammatory standard so delegates and funders can discover it.
            </Typography>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How money and attestations flow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A supporter pledges funds into an escrow contract tied to a channel or content item. The creator verifies ownership to withdraw. Separately, AI evaluators assess whether content meets the noninflammatory standard — steelmanning, avoiding contempt, resisting tribal signaling — and publish attestations. Delegates and funders choose which evaluators they trust, so funding decisions can flow toward attested content automatically.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            What passes and what fails
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2">Passing example</Typography>
              <Typography variant="body2" color="text.secondary">
                A piece argues for stricter immigration enforcement while opening by acknowledging that most immigrants are people trying to build better lives, that the progressive concern for their wellbeing is genuine, and that the policy question is about trade-offs rather than who is a good person. It engages with the strongest progressive arguments, not the weakest ones.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Failing example</Typography>
              <Typography variant="body2" color="text.secondary">
                A piece has true facts but leans on mockery, contempt, or cheap outgroup cues — painting the other side as naive, unpatriotic, or evil — that make reasonable people stop listening before they ever engage with the argument.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Another passing example</Typography>
              <Typography variant="body2" color="text.secondary">
                A progressive writer explains why they support universal healthcare while explicitly addressing the conservative concern about government overreach and waste, treating that concern as legitimate rather than dismissible.
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Read the walkthrough
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            The walkthrough follows a conservative writer who crafts an immigration piece that a progressive reader can engage with, shows how left-leaning and right-leaning donors end up funding the same work through different paths in the implication graph, and explains why nobody had to build a coalition for it to happen.
          </Typography>
          <Button component="a" href={getDomainUrl('commonality', '/docs/use-case-walkthroughs/noninflammatory-content', { fallbackHref: '#' })} size="small">
            Read the full walkthrough
          </Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How this site relates to the others
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Civility uses the same escrow and payout flows as Content Funding. Tally is where people inspect or sign the claims behind the content. Common Sense Majority is the movement that uses bridge-building media as its primary wedge.
          </Typography>
          <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '#' })} size="small">
            Explore statements on Tally
          </Button>
        </Paper>
      </Stack>
    </Box>
  )
}
