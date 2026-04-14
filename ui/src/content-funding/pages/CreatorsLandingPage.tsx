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

export function CreatorsLandingPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Creators
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 680 }}>
        Any piece of content with a URL — a tweet, a YouTube video, a Substack post — can be registered here and funded by people who find it valuable. AI evaluators assess whether content meets a cause's quality bar; money flows to creators who pass.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 680 }}>
        If you're a creator, claim your channel to receive funds directly. If you're a supporter, browse below to find creators aligned with the causes you care about.
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

      <Button component={RouterLink} to="/docs/key-ideas/content-funding" variant="text" size="small">
        Learn how content funding works
      </Button>
    </Box>
  )
}
