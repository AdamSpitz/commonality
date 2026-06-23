import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { ProjectDetailPage } from '../../lazy-giving/pages/ProjectDetailPage'
import { getDomainUrl } from '../domainUrls'
import { contentContractPathForAddress } from '../../shared'

function getNoninflammatoryContractPath(address: string): string {
  return contentContractPathForAddress(address)
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
        Civility is about putting money behind one kind of content: political writing you'd actually be willing to read from people you disagree with — and writing from your own side, crafted to actually reach the other side. It is not a new piece of technology — it is an ecosystem built on Content Funding, pointed at noninflammatory content and wired up to make funding it nearly effortless. The point is not bland centrism — it is to fund writing and media that helps people on opposite sides actually hear each other.
      </Typography>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            What counts as noninflammatory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Imagine the statement at the center of all this: "I'm willing to read content from people I disagree with — if it's written in a way that doesn't piss me off." What satisfies that is partly generic and partly personal.
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2">Generic</Typography>
              <Typography variant="body2" color="text.secondary">
                The things good-faith writing does regardless of side: steelmanning the opposing view instead of strawmanning or weakmanning it, arguing without contempt, and not reaching for tribal applause lines.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Point-of-view-specific</Typography>
              <Typography variant="body2" color="text.secondary">
                What actually reads as respectful depends on who's reading. A left-leaning reader and a right-leaning reader get set off by different things, so they filter differently. There is no single neutral judge — Civility lets each side define what does not piss them off. It is also why you can fund your own side's content judged by the other side's filter: a conservative funds writing that passes the left's filter to reach the left, and a progressive does the reverse.
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Who this is for
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2">Readers and donors</Typography>
              <Typography variant="body2" color="text.secondary">
                You are tired of polarized outrage bait and want to fund writing that communicates across divides. Back specific pieces or channels, or just delegate to someone you trust — your money stays in escrow until the creator verifies.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Creators</Typography>
              <Typography variant="body2" color="text.secondary">
                You write or produce content that steelmans the other side, avoids contempt, and invites engagement rather than defensiveness. There is a pool of money earmarked for exactly this — verify your channel and collect what supporters have already pooled.
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
            How funding stays easy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Every funding decision ultimately belongs to a human donor. Two things keep those decisions easy instead of exhausting.
          </Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2">AI does the legwork</Typography>
              <Typography variant="body2" color="text.secondary">
                Finding the rare good piece means wading through mountains of the other side's content — aggravating work almost nobody wants to do. AI evaluators read enormous amounts of content, judge whether each piece meets a noninflammatory standard, and surface a short list of candidates. You browse what the AI has already vouched for instead of grinding through the slop yourself.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">The AI is open, and you choose which to trust</Typography>
              <Typography variant="body2" color="text.secondary">
                To judge tone, these services follow the ambient discourse closely enough to catch references, sarcasm, and snark — which is subjective. So the default evaluators are open: you can{' '}
                <RouterLink to="/docs/noninflammatory/evaluator-prompts">read their actual prompts</RouterLink>
                {' '}or self-host your own, and which ones you trust is configurable. Switch to a different evaluator, or trust several at once. There is no single gatekeeper.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Or hand the keys to a person</Typography>
              <Typography variant="body2" color="text.secondary">
                If you'd rather not manage any of this, delegate your money to someone whose judgment you trust and let them make the calls. You can watch what they fund — everything is public — or change your mind anytime.
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            The whole thing, in one breath
          </Typography>
          <Typography variant="body2" color="text.secondary">
            "Sure — I'll put $10 a month toward making more noninflammatory content exist. I'll let my friend Andrew, who follows this stuff more closely than I do, make the actual picks." …and then never think about it again. From the other side, a creator looks at the cause board, sees a real pool of money earmarked for noninflammatory content, and thinks, "I could write some of that." Visible demand pulls supply into existence.
          </Typography>
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
          <Button component="a" href={getDomainUrl('commonality', '/docs/use-case-walkthroughs/noninflammatory-content')} size="small">
            Read the full walkthrough
          </Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How this site relates to the others
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Civility uses the same escrow and payout flows as Content Funding. Tally is where people inspect or sign the claims behind the content. Common Sense Majority is the movement that uses bridge-building media as its primary wedge — Civility is useful on its own, but it is also the engine that carries an idea across the divide in a form the other side can take in.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button component="a" href={getDomainUrl('content-funding', '/')} size="small">
              Open Content Funding
            </Button>
            <Button component="a" href={getDomainUrl('tally', '/statements')} size="small">
              Explore statements on Tally
            </Button>
            <Button component="a" href={getDomainUrl('common-sense-majority', '/')} size="small">
              See Common Sense Majority
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
