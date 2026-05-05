import { Paper, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: "Want to find out when your own side is lying to you, but can't stomach following the other side's bullshit?",
    description: 'Get recommendations vetted by *your* side, for noninflammatory content from the *other* side',
  },
  {
    title: "Want your side's ideas to actually reach the other side?",
    description: 'Fund the messengers who know how to deliver them',
  },
]

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      title="Fund civility"
      description="Let's reward noninflammatory content"
      spotlights={[
        {
          label: 'Each side gets to say what they find inflammatory',
          text: 'Identify and fund content that passes your own side\'s - or the other side\'s - "will this content *not* piss me off?" filter',
        },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="body2" color="text.secondary">
          AI does the filtering so you don't have to
        </Typography>
      </Paper>
    </DomainLandingPage>
  )
}
