import { Box, Paper, Stack, Typography, Button } from '@mui/material'
import { getDomainUrl } from '../domainUrls'

const participationOptions = [
  {
    title: 'Donate to a cause',
    description: 'Use Alignment to browse crowdfundable projects aligned with causes you care about.',
    href: getDomainUrl('alignment', '/', { fallbackHref: '/docs/key-ideas/funding-portals' }),
    cta: 'Go to Alignment',
  },
  {
    title: 'Fund a concrete project',
    description: 'Use LazyGiving for individual assurance contracts: one project, one funding goal, refunds if it does not clear.',
    href: getDomainUrl('lazyGiving', '/', { fallbackHref: '/docs/use-case-walkthroughs/defunding' }),
    cta: 'Go to LazyGiving',
  },
  {
    title: 'Support better social-media content',
    description: 'Use Content Funding or Civility to reward creators for the kind of content you want more of.',
    href: getDomainUrl('content-funding', '/', { fallbackHref: '/docs/content-funding/content-funding' }),
    cta: 'Go to Content Funding',
  },
  {
    title: 'Join the Common Sense Majority thesis',
    description: 'Use CSM to make quiet-middle agreement visible and fund organizing around it.',
    href: getDomainUrl('common-sense-majority', '/', { fallbackHref: '/docs/use-case-walkthroughs/common-sense-majority' }),
    cta: 'Go to CSM',
  },
  {
    title: 'Sign statements',
    description: 'Use Tally to sign claims in your own words and see direct plus indirect support.',
    href: getDomainUrl('tally', '/', { fallbackHref: '/docs/key-ideas/concept-space' }),
    cta: 'Go to Tally',
  },
  {
    title: 'Delegate your donation decisions',
    description: 'Use Delegation to route money through someone whose judgment you trust.',
    href: getDomainUrl('lazyGiving', '/delegation/notes', { fallbackHref: '/docs/key-ideas/delegation' }),
    cta: 'Go to Delegation',
  },
]

export function CommonalityParticipatePage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        How can I participate?
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Pick the site that matches what you want to do. Commonality is the movement/thesis layer; the concrete workflows live on focused product and movement sites.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {participationOptions.map((option) => (
          <Paper key={option.title} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h6">{option.title}</Typography>
              <Typography variant="body2" color="text.secondary">{option.description}</Typography>
              <Button component="a" href={option.href} size="small" sx={{ alignSelf: 'flex-start' }}>
                {option.cta}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
