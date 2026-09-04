import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { YourProjects } from '../components/YourProjects'
import { useUserProjects } from '../hooks/useUserProjects'

export function WorkPage() {
  const { projects, loading, connected } = useUserProjects()
  const created = projects.filter((project) => project.relations.includes('created'))
  const bookmarked = projects.filter((project) => project.relations.includes('bookmarked'))

  return (
    <Stack spacing={3} data-testid="work-workspace">
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}
        >
          Work
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
          Publish a piece of work and watch the projects you care about. Creating a
          project is the official creator role. Funding a project belongs in Fund;
          alignment and success attestations belong in Evaluate when that workspace exists.
          The payout recipient can be a different address from the creator.
        </Typography>
      </Box>

      <YourProjects
        heading="Your projects"
        empty="No projects created with this wallet yet. If you would do the work but cannot self-fund, create one here."
        projects={created}
        loading={loading}
        connected={connected}
        showCreate
        mode="work"
        testId="work-created-projects"
        connectHint="Connect a wallet to see projects you created."
      />

      <YourProjects
        heading="Bookmarked projects"
        empty="No bookmarked projects yet. Bookmark from a project page; the list is shared with Fund."
        projects={bookmarked}
        loading={loading}
        connected={connected}
        mode="work"
        testId="work-bookmarked-projects"
        connectHint="Connect a wallet to hydrate bookmarks saved on this wallet."
      />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Looking for money or a cause board?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          Directing money is Fund. Publishing a mix of statements is Organize.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} to="/dashboard" sx={{ px: 0 }}>Go to Fund</Button>
          <Button component={RouterLink} to="/causes" sx={{ px: 0 }}>Go to Organize</Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
