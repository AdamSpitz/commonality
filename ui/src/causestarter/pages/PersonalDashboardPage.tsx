import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { YourDashboard } from '../components/YourDashboard'
import { FundMoneySources } from '../components/FundMoneySources'
import { YourProjects } from '../components/YourProjects'
import { useUserProjects } from '../hooks/useUserProjects'

export function PersonalDashboardPage() {
  const { projects, loading, connected } = useUserProjects()
  const bookmarked = projects.filter((project) => project.relations.includes('bookmarked'))

  return (
    <Stack spacing={2} data-testid="fund-workspace">
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}
        >
          Fund
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
          Help proposed work reach its threshold. Your personal board uses the
          statements and filters you choose; signing a statement does not change it.
        </Typography>
      </Box>
      <FundMoneySources />
      <YourDashboard layout="page" />
      <YourProjects
        heading="Bookmarked projects"
        empty="No bookmarked projects yet. Bookmark from a project page; the list is shared with Work."
        projects={bookmarked}
        loading={loading}
        connected={connected}
        mode="fund"
        testId="fund-bookmarked-projects"
        connectHint="Connect a wallet to hydrate bookmarks saved on this wallet."
        about="The same bookmark list as Work. Bookmarks follow the wallet when connected."
      />
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Want to publish a project?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          Creating and managing your own work lives in the Work workspace.
        </Typography>
        <Button component={RouterLink} to="/work" sx={{ px: 0 }}>Go to Work</Button>
      </Paper>
    </Stack>
  )
}
