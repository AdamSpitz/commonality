import { Box, Stack, Typography } from '@mui/material'
import { ToolCard } from '../components/ToolCard'
import { SUPPORTING_TOOLS } from '../lib/tools'

const sections = [
  {
    key: 'substrate' as const,
    title: 'Growth tools',
    description: 'Ways to grow support, move money, and coordinate work for your cause.',
  },
  {
    key: 'reference' as const,
    title: 'Example causes',
    description: 'Worked examples of focused causes you can learn from.',
  },
  {
    key: 'thesis' as const,
    title: 'Background',
    description: 'Why this approach to public goods exists — optional reading.',
  },
]

export function ToolsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Tools
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Extra tools for starting and growing a cause. Open what you need; keep CauseStarter as
          home base.
        </Typography>
      </Box>

      {sections.map((section) => {
        const tools = SUPPORTING_TOOLS.filter((tool) => tool.kind === section.key)
        if (tools.length === 0) return null
        return (
          <Box key={section.key}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {section.title}
            </Typography>
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
