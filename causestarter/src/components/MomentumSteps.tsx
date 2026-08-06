import { Box, Stack, Typography } from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import GroupsIcon from '@mui/icons-material/Groups'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import type { ReactNode } from 'react'

const steps: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <FlagIcon fontSize="small" />,
    title: 'Start',
    body: 'State the goal and supporting beliefs people can stand behind.',
  },
  {
    icon: <GroupsIcon fontSize="small" />,
    title: 'Grow',
    body: 'Bring in supporters, volunteers, and collaborators with clear asks.',
  },
  {
    icon: <RocketLaunchIcon fontSize="small" />,
    title: 'Deliver',
    body: 'Fund projects, back creators, and keep score in public.',
  },
]

export function MomentumSteps() {
  return (
    <Stack spacing={1.5}>
      {steps.map((step, index) => (
        <Box
          key={step.title}
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1.75,
            borderRadius: 2.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              flexShrink: 0,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {index + 1}
          </Box>
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{step.icon}</Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {step.title}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {step.body}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
