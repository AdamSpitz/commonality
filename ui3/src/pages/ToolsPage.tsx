import { Box, Stack, Typography } from '@mui/material'
import { ToolCard } from '../components/ToolCard'
import { ONLINE_TOOLS } from '../lib/tools'

const sections = [
  {
    keys: ['funding', 'delegation', 'content', 'statements'] as const,
    title: 'Online tools',
    description:
      'Same local Hardhat wallet for chain actions — these open the live domain UIs (gateway or configured URLs).',
  },
  {
    keys: ['reference'] as const,
    title: 'Examples & thesis',
    description: 'Worked verticals and background reading.',
  },
]

export function ToolsPage() {
  return (
    <Stack spacing={3} data-testid="tools-page">
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Tools
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Projects, funding, delegation, and statement browsers live here. ui3 stays home for causes,
          goals, beliefs, members, and aggregates.
        </Typography>
      </Box>

      {sections.map((section) => {
        const tools = ONLINE_TOOLS.filter((t) => (section.keys as readonly string[]).includes(t.kind))
        if (tools.length === 0) return null
        return (
          <Box key={section.title}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{section.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {section.description}
            </Typography>
            <Stack spacing={1.25}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
