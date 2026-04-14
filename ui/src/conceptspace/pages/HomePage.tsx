import { useState } from 'react'
import { Box, Typography, Paper, Button, Alert, Stack } from '@mui/material'
import { useAccount } from 'wagmi'
import { Link, useNavigate } from 'react-router-dom'
import { CreateStatementForm } from '../components'
import type { IpfsCidV1 } from '@commonality/sdk'

const gettingStartedSteps = [
  {
    title: 'Start with one walkthrough',
    description:
      'See a concrete example before touching wallet settings or advanced tools.',
    cta: 'Read the walkthrough',
    to: '/docs/use-case-walkthroughs/noninflammatory-content',
  },
  {
    title: 'Browse statements',
    description:
      'Statements are the entry point. They show what people care about and what ideas connect.',
    cta: 'Browse statements',
    to: '/statements',
  },
  {
    title: 'Connect only when ready',
    description:
      'Connect your wallet once you know why you want to sign a statement, pledge, or claim something.',
    cta: 'See all getting-started docs',
    to: '/docs',
  },
]

const roleCards = [
  {
    title: 'Express what you care about',
    description: 'Sign a statement in your own words and discover related causes.',
    to: '/docs/roles/express-what-you-care-about',
  },
  {
    title: 'Fund a project',
    description: 'Back a project with a refundable pledge if the goal is met.',
    to: '/projects',
  },
  {
    title: 'Support creators',
    description: 'Explore creators and channels that fit the causes you care about.',
    to: '/content/twitter',
  },
]

export function HomePage() {
  const { address, isConnected } = useAccount()
  const navigate = useNavigate()
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleStatementCreated = (statementCid: IpfsCidV1) => {
    setShowCreateForm(false)
    navigate(`/statement/${statementCid}`)
  }

  const hero = (
    <Paper
      sx={{
        p: { xs: 3, md: 4 },
        mb: 3,
        borderRadius: 4,
        color: '#14213d',
        background:
          'linear-gradient(135deg, rgba(216, 243, 220, 0.96) 0%, rgba(247, 201, 72, 0.92) 100%)',
      }}
    >
      <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
        Shared values, clearer first steps
      </Typography>
      <Typography
        variant="h3"
        component="h1"
        sx={{
          mt: 1,
          mb: 2,
          fontWeight: 700,
          lineHeight: 1.1,
          fontSize: { xs: '2rem', md: '2.8rem' },
        }}
      >
        Fund projects and content around what people actually care about.
      </Typography>
      <Typography variant="h6" sx={{ maxWidth: 780, fontWeight: 500 }}>
        A conservative and a progressive can end up funding the same piece of writing — without ever coordinating. That's the core idea: shared values, discovered automatically.
      </Typography>
      <Typography variant="body1" sx={{ maxWidth: 680, mt: 1.5, opacity: 0.85 }}>
        Start by reading one example, then browse statements, then connect your wallet only when you know what you want to do.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
        <Button component={Link} to="/docs" variant="contained" color="primary">
          Start with docs
        </Button>
        <Button
          component={Link}
          to="/docs/use-case-walkthroughs/noninflammatory-content"
          variant="outlined"
          color="inherit"
        >
          Read a walkthrough
        </Button>
        <Button component={Link} to="/statements" variant="text" color="inherit">
          Browse statements first
        </Button>
      </Stack>
    </Paper>
  )

  const onboardingSection = (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
      {gettingStartedSteps.map((step, index) => (
        <Paper key={step.title} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Step {index + 1}
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {step.description}
          </Typography>
          <Button component={Link} to={step.to} size="small">
            {step.cta}
          </Button>
        </Paper>
      ))}
    </Box>
  )

  if (!isConnected) {
    return (
      <Box>
        {hero}

        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
          Best first path for a new user
        </Typography>
        {onboardingSection}

        <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: 700 }}>
          Pick one thing to do
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {roleCards.map((card) => (
            <Paper key={card.title} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {card.description}
              </Typography>
              <Button component={Link} to={card.to} size="small">
                Explore
              </Button>
            </Paper>
          ))}
        </Box>

        <Alert severity="info" sx={{ mt: 4 }}>
          You do not need to connect a wallet just to understand the app. Start with
          docs and browsing, then connect when you want to act onchain.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      {hero}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
          Ready to take the next step?
        </Typography>
        <Button component={Link} to={`/user/${address}`} variant="outlined">
          View My Profile
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Connected as: {address}
      </Alert>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Suggested flow
      </Typography>
      {onboardingSection}

      {!showCreateForm ? (
        <Paper sx={{ p: 3, mb: 3, mt: 3, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If you already understand the basics, the simplest entry point is still to
            create one statement that captures something you care about.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowCreateForm(true)}
            sx={{ mr: 2 }}
          >
            Create and Sign Statement
          </Button>
          <Button component={Link} to="/statements" variant="outlined" sx={{ mr: 2 }}>
            Browse Statements
          </Button>
          <Button component={Link} to="/docs" variant="text">
            Review the docs first
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mb: 3 }}>
          <CreateStatementForm onStatementCreated={handleStatementCreated} />
          <Button
            onClick={() => setShowCreateForm(false)}
            sx={{ mt: 2 }}
          >
            Cancel
          </Button>
        </Box>
      )}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your profile shows the statements you have signed, the things you have
          created, and the public trail of what you are building around.
        </Typography>
        <Button
          component={Link}
          to={`/user/${address}`}
          variant="text"
          sx={{ mt: 1 }}
        >
          Go to My Profile
        </Button>
      </Paper>
    </Box>
  )
}
