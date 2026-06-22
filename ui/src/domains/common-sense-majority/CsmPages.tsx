import { useState } from 'react'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { getDomainUrl } from '../domainUrls'
import { buildCompleteBridgeCards, csmBridgeAnchors, formatBridgeTopic, getBridgeAnchorTallyPath, getBridgeTopics, type BridgeCardModel } from './csmBridges'

const csmProductSignposts = [
  {
    title: 'Fund bridge-building media on Civility',
    description: 'Civility is the content-funding surface for noninflammatory media: persuasive content that can reach people across coalition lines.',
    href: getDomainUrl('civility', '/', { fallbackHref: '#' }),
    cta: 'Go to Civility',
  },
  {
    title: 'Sign movement-aligned statements on Tally',
    description: 'Tally is where people sign statements in their own words and inspect direct plus indirect support counts.',
    href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
    cta: 'Open Tally statements',
  },
  {
    title: 'Fund ongoing causes on Aligning',
    description: 'Aligning hosts cause boards for causes and cause-aligned projects; CSM uses it rather than embedding its board routes here.',
    href: getDomainUrl('alignment', '/', { fallbackHref: '#' }),
    cta: 'Go to Aligning',
  },
  {
    title: 'Back concrete projects on LazyGiving',
    description: 'LazyGiving handles one-off assurance contracts for organizing work, research, outreach, and other concrete projects.',
    href: getDomainUrl('lazyGiving', '/', { fallbackHref: '#' }),
    cta: 'Go to LazyGiving',
  },
]

const csmNudgers = [
  {
    title: 'Common Sense Majority bridge-builder nudger',
    description: 'Suggests statements that move politically homeless users toward broad, noninflammatory common-ground claims.',
    href: getDomainUrl('tally', '/settings', { fallbackHref: '#' }),
    cta: 'Configure on Tally',
  },
]

const csmBridgeCards = buildCompleteBridgeCards(csmBridgeAnchors)

function BridgeCard({ bridge }: { bridge: BridgeCardModel }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={2.5}>
        <Chip label={formatBridgeTopic(bridge.topic)} size="small" sx={{ alignSelf: 'flex-start' }} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
            <Typography variant="overline" color="text.secondary">
              Moderate-left starting point
            </Typography>
            <Typography variant="body1">{bridge.moderateLeft.text}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
            <Typography variant="overline" color="text.secondary">
              Moderate-right starting point
            </Typography>
            <Typography variant="body1">{bridge.moderateRight.text}</Typography>
          </Paper>
        </Box>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
          <Typography variant="overline" color="primary.main">
            Common ground they can both sign
          </Typography>
          <Typography variant="h6" component="p">
            {bridge.commonGround.text}
          </Typography>
        </Paper>
        <Button
          component="a"
          href={getDomainUrl('tally', getBridgeAnchorTallyPath(bridge.commonGround), { fallbackHref: getBridgeAnchorTallyPath(bridge.commonGround) })}
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
        >
          {bridge.commonGround.tally_cid ? 'View and sign on Tally' : 'Sign your version on Tally'}
        </Button>
      </Stack>
    </Paper>
  )
}

function CsmProductSignposts() {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
      {csmProductSignposts.map((signpost) => (
        <Paper key={signpost.title} sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">{signpost.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {signpost.description}
            </Typography>
            <Button component="a" href={signpost.href} size="small" sx={{ alignSelf: 'flex-start' }}>
              {signpost.cta}
            </Button>
          </Stack>
        </Paper>
      ))}
    </Box>
  )
}

export function CsmBridgesPage() {
  const topics = getBridgeTopics(csmBridgeCards)
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const visibleBridges = selectedTopic === 'all' ? csmBridgeCards : csmBridgeCards.filter((bridge) => bridge.topic === selectedTopic)

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Common ground bridges
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5, maxWidth: 820 }}>
        These are AI-synthesized suggested bridges, not poll results or claims about what any individual believes. Treat each bridge as an invitation: if the common-ground version is true for you, sign your own version on Tally.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 820 }}>
        Each card starts with two positions that can sound opposed, then reveals the claim they already largely share.
      </Typography>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }} aria-label="Bridge topic filters">
        <Chip label="All" clickable color={selectedTopic === 'all' ? 'primary' : 'default'} onClick={() => setSelectedTopic('all')} />
        {topics.map((topic) => (
          <Chip key={topic} label={formatBridgeTopic(topic)} clickable color={selectedTopic === topic ? 'primary' : 'default'} onClick={() => setSelectedTopic(topic)} />
        ))}
      </Stack>

      <Stack spacing={3}>
        {visibleBridges.map((bridge) => (
          <BridgeCard key={bridge.id} bridge={bridge} />
        ))}
      </Stack>
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
      <Stack spacing={2} sx={{ mb: 4 }}>
        {[
          "Most people are reasonable; the loudest voices aren't representative.",
          'The country would be better off if normal people could see how much common ground already exists.',
          'I want political content that helps people disagree without despising each other.',
        ].map((statement) => (
          <Paper key={statement} sx={{ p: 2 }}>
            <Typography variant="body1">{statement}</Typography>
          </Paper>
        ))}
        <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '#' })} variant="contained" sx={{ alignSelf: 'flex-start' }}>
          Open Tally statements
        </Button>
      </Stack>
      <Typography variant="h5" component="h2" gutterBottom>
        Use the focused products
      </Typography>
      <CsmProductSignposts />
    </Box>
  )
}

export function CsmNudgersPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        CSM nudgers
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Nudgers are trusted services that suggest next statements to consider. CSM does not host a separate organizing app here; use Tally to add CSM-aligned nudgers to your own statement-signing workflow.
      </Typography>
      <Stack spacing={2} sx={{ mb: 4 }}>
        {csmNudgers.map((nudger) => (
          <Paper key={nudger.title} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h6">{nudger.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {nudger.description}
              </Typography>
              <Button component="a" href={nudger.href} size="small" sx={{ alignSelf: 'flex-start' }}>
                {nudger.cta}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Typography variant="h5" component="h2" gutterBottom>
        Other CSM tools live on focused sites
      </Typography>
      <CsmProductSignposts />
    </Box>
  )
}

export function CsmOrganizingPage() {
  return <CsmNudgersPage />
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

      <Stack spacing={2} sx={{ mb: 4 }}>
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
              • Read the movement thesis and the walkthrough.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Find CSM-related statements and nudgers.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Follow signpost links to focused products for signing, content funding, cause funding, and project funding.
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
            Civility funds bridge-building media. Tally handles statement signing and indirect support counts. Aligning handles ongoing cause funding, while LazyGiving handles one-off organizing projects. Conceptspace provides the underlying statement, implication, attester, and trust infrastructure. CSM links to those products instead of duplicating their routes.
          </Typography>
        </Paper>
      </Stack>

      <Typography variant="h5" component="h2" gutterBottom>
        Use the focused products
      </Typography>
      <CsmProductSignposts />
    </Box>
  )
}
