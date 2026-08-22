import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ConnectWalletHint } from './ConnectWalletHint'
import { HeaderInfoTip } from './HeaderInfoTip'
import { ProjectCard } from './ProjectCard'
import { useUserProjects } from '../hooks/useUserProjects'

export function YourProjects() {
  const navigate = useNavigate()
  const { projects, loading, connected } = useUserProjects()

  return (
    <Stack spacing={1.5} data-testid="home-projects">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Projects
          </Typography>
          <HeaderInfoTip
            title="Projects this wallet created or contributed to, plus any you bookmarked. Bookmarks follow the wallet when connected."
            label="About your projects"
          />
        </Stack>
        <Button
          variant="outlined"
          data-testid="home-create-project"
          sx={{
            minHeight: 40,
            px: 1.75,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            mt: 0.35,
          }}
          onClick={() => navigate('/projects/new')}
        >
          Create Project
        </Button>
      </Box>

      {!connected && projects.length === 0 && (
        <ConnectWalletHint>Connect a wallet to see projects you created or contributed to.</ConnectWalletHint>
      )}

      {loading && projects.length === 0 && connected && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading projects…
          </Typography>
        </Stack>
      )}

      {connected && !loading && projects.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No projects yet. If you would do the work but cannot self-fund, create one
          and ask a better-connected friend for an alignment vouch — no grant officer.
          Contribute or bookmark if your job is money or attention instead.
        </Alert>
      )}

      {projects.map((project) => (
        <ProjectCard key={project.project.id} project={project} />
      ))}
    </Stack>
  )
}
