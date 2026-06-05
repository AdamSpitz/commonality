import { Box, Typography, Card, CardContent, CardActionArea, Stack, Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import TwitterIcon from '@mui/icons-material/Twitter'
import YouTubeIcon from '@mui/icons-material/YouTube'
import ArticleIcon from '@mui/icons-material/Article'

const platforms = [
  {
    label: 'Twitter / X',
    description: 'Fund tweets, threads, and creators posting on Twitter.',
    path: '/content/twitter',
    icon: <TwitterIcon fontSize="large" />,
  },
  {
    label: 'YouTube',
    description: 'Fund videos and channels producing content you value.',
    path: '/content/youtube',
    icon: <YouTubeIcon fontSize="large" />,
  },
  {
    label: 'Substack',
    description: 'Fund newsletters and writers publishing on Substack.',
    path: '/content/substack',
    icon: <ArticleIcon fontSize="large" />,
  },
]

interface CreatorsLandingPageProps {
  title?: string
  description?: string
  secondaryDescription?: string
  learnMoreLabel?: string
  learnMorePath?: string
}

export function CreatorsLandingPage({
  title = 'Creators',
  description = 'Any piece of content with a URL — a tweet, a YouTube video, a Substack post — can be funded here the same way projects are funded on LazyGiving: supporters pledge, and the money is released only if it reaches the creator\'s funding goal (otherwise everyone is refunded).',
  secondaryDescription = 'If you\'re a creator, claim your channel and group your content into a contract to start collecting. If you\'re a supporter, browse below to find creators whose work you want to reward.',
  learnMoreLabel = 'Learn how content funding works',
  learnMorePath = '/docs/content-funding/content-funding',
}: CreatorsLandingPageProps) {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 680 }}>
        {description}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 680 }}>
        {secondaryDescription}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        {platforms.map((p) => (
          <Card key={p.path} sx={{ flex: 1 }}>
            <CardActionArea component={RouterLink} to={p.path} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Box sx={{ color: 'text.secondary', mb: 1 }}>{p.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {p.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <Button component={RouterLink} to={learnMorePath} variant="text" size="small">
        {learnMoreLabel}
      </Button>
    </Box>
  )
}
