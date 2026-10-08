import { Box, Paper, Stack, Typography } from '@mui/material'

const CONCEPTS = [
  { name: 'Cause', blurb: 'Title + goal. Founders drive it; supporters stand by the goal and beliefs.' },
  { name: 'Goal', blurb: 'One statement of the change you want in the world.' },
  { name: 'Beliefs', blurb: 'What motivates founders and supporters toward that goal.' },
  { name: 'Timeline', blurb: 'Milestones on the path; each has measures for status.' },
  { name: 'Projects', blurb: 'Work toward the goal and milestones — support, volunteer, or fund.' },
  { name: 'People', blurb: 'Founders, supporters, and volunteers with clear roles.' },
] as const

export function ConceptMap() {
  return (
    <Stack spacing={1.25}>
      {CONCEPTS.map((c) => (
        <Paper
          key={c.name}
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
          }}
        >
          <Box
            sx={{
              mt: 0.25,
              minWidth: 72,
              px: 1,
              py: 0.35,
              borderRadius: 999,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {c.name}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.15 }}>
            {c.blurb}
          </Typography>
        </Paper>
      ))}
    </Stack>
  )
}
