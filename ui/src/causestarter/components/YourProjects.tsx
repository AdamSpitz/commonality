import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { ConnectWalletHint } from './ConnectWalletHint'
import { HeaderInfoTip } from '../../shared'
import { ProjectCard } from './ProjectCard'
import type { UserProject } from '../lib/userProjects'

const HOME_PREVIEW_LIMIT = 3

export function YourProjects({
  compact = false,
  heading,
  empty,
  projects,
  loading,
  connected,
  showCreate = false,
  mode,
  testId = 'home-projects',
  connectHint = 'Connect a wallet to see projects you created or contributed to.',
  about = 'Projects this wallet created, plus any you bookmarked. Bookmarks follow the wallet when connected and are shared with Fund.',
}: {
  compact?: boolean
  heading: string
  empty: string
  projects: UserProject[]
  loading: boolean
  connected: boolean
  showCreate?: boolean
  mode?: 'work' | 'fund'
  testId?: string
  connectHint?: string
  about?: string
}) {
  const navigate = useNavigate()
  const shown = compact ? projects.slice(0, HOME_PREVIEW_LIMIT) : projects

  return (
    <Stack spacing={1.5} data-testid={testId}>
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
            {heading}
          </Typography>
          <HeaderInfoTip
            title={about}
            label={`About ${heading.toLowerCase()}`}
          />
        </Stack>
        {showCreate && (
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
        )}
      </Box>

      {!connected && projects.length === 0 && (
        <ConnectWalletHint>{connectHint}</ConnectWalletHint>
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
          {empty}
        </Alert>
      )}

      {shown.length > 0 && (
        <Stack spacing={0.75}>
          {shown.map((project) => (
            <ProjectCard key={project.project.id} project={project} mode={mode} />
          ))}
        </Stack>
      )}

      {compact && projects.length > shown.length && (
        <Button
          component={RouterLink}
          to={mode === 'work' ? '/work' : '/dashboard'}
          sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
        >
          See all
        </Button>
      )}
    </Stack>
  )
}
