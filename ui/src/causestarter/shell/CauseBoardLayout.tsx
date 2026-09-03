import type { ReactNode } from 'react'
import { Box } from '@mui/material'

/**
 * Same cause-board regions on every viewport. Phone stacks them in reading
 * order; md+ puts chrome / funding / publish in a rail beside the work.
 */
export function CauseBoardLayout({
  chrome,
  header,
  description,
  alerts,
  funding,
  publish,
  statements,
  rest,
}: {
  chrome?: ReactNode
  header: ReactNode
  description?: ReactNode
  alerts?: ReactNode
  funding?: ReactNode
  publish?: ReactNode
  statements: ReactNode
  rest?: ReactNode
}) {
  return (
    <Box
      data-testid="cause-detail-page"
      sx={{
        display: 'grid',
        gap: 2.5,
        alignItems: 'start',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'minmax(0, 1fr) minmax(260px, 320px)',
        },
        gridTemplateAreas: {
          xs: `
            "chrome"
            "header"
            "description"
            "alerts"
            "funding"
            "publish"
            "statements"
            "rest"
          `,
          md: `
            "header chrome"
            "description chrome"
            "alerts funding"
            "statements publish"
            "rest rest"
          `,
        },
      }}
    >
      {chrome ? (
        <Box data-testid="cause-board-chrome" sx={{ gridArea: 'chrome' }}>
          {chrome}
        </Box>
      ) : null}
      <Box data-testid="cause-board-header" sx={{ gridArea: 'header' }}>
        {header}
      </Box>
      {description ? (
        <Box data-testid="cause-board-description" sx={{ gridArea: 'description' }}>
          {description}
        </Box>
      ) : null}
      {alerts ? (
        <Box data-testid="cause-board-alerts" sx={{ gridArea: 'alerts' }}>
          {alerts}
        </Box>
      ) : null}
      {funding ? (
        <Box data-testid="cause-board-rail" sx={{ gridArea: 'funding' }}>
          {funding}
        </Box>
      ) : null}
      {publish ? (
        <Box data-testid="cause-board-publish" sx={{ gridArea: 'publish', position: { md: 'sticky' }, top: { md: 80 } }}>
          {publish}
        </Box>
      ) : null}
      <Box data-testid="cause-board-main" sx={{ gridArea: 'statements' }}>
        {statements}
      </Box>
      {rest ? (
        <Box data-testid="cause-board-rest" sx={{ gridArea: 'rest' }}>
          {rest}
        </Box>
      ) : null}
    </Box>
  )
}
