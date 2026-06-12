import { Box } from '@mui/material'
import retroFundingStoryHtml from '../../../../docs/end-user/shared/diagrams/retro-funding-story.poc.html?raw'

const embeddedRetroFundingStoryHtml = retroFundingStoryHtml.replace(
  '<html lang="en">',
  '<html lang="en" class="embed">',
)

export function RetroFundingStory() {
  return (
    <Box
      component="iframe"
      title="Animated story showing early backers funding a project and later users buying them out"
      srcDoc={embeddedRetroFundingStoryHtml}
      sx={{
        width: '100%',
        aspectRatio: '1040 / 512',
        border: 0,
        borderRadius: 2,
        overflow: 'hidden',
        my: 3,
      }}
    />
  )
}
