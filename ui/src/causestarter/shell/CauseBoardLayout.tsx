import type { ReactNode } from 'react'
import { Box } from '@mui/material'

/**
 * Same cause-board regions on every viewport. Phone stacks them in reading
 * order; md+ puts chrome / funding / publish in one rail beside the work.
 * The rail column is omitted when those slots are empty so the page does
 * not keep a blank 260–320px track.
 */
export function causeBoardGridSx(hasRail: boolean) {
  return {
    display: 'grid',
    gap: 2.5,
    alignItems: 'start',
    gridTemplateColumns: {
      xs: 'minmax(0, 1fr)',
      md: hasRail ? 'minmax(0, 1fr) minmax(260px, 320px)' : 'minmax(0, 1fr)',
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
      md: hasRail
        ? `
            "header rail"
            "description rail"
            "alerts rail"
            "statements rail"
            "rest rest"
          `
        : `
            "header"
            "description"
            "alerts"
            "statements"
            "rest"
          `,
    },
  } as const
}

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
  const hasRail = Boolean(chrome || funding || publish)

  return (
    <Box data-testid="cause-detail-page" sx={causeBoardGridSx(hasRail)}>
      {hasRail ? (
        <Box
          data-testid="cause-board-rail"
          sx={{
            display: { xs: 'contents', md: 'flex' },
            flexDirection: 'column',
            gap: 2.5,
            gridArea: { md: 'rail' },
            position: { md: 'sticky' },
            top: { md: 80 },
          }}
        >
          {chrome ? (
            <Box data-testid="cause-board-chrome" sx={{ gridArea: { xs: 'chrome' } }}>
              {chrome}
            </Box>
          ) : null}
          {funding ? (
            <Box data-testid="cause-board-funding" sx={{ gridArea: { xs: 'funding' } }}>
              {funding}
            </Box>
          ) : null}
          {publish ? (
            <Box data-testid="cause-board-publish" sx={{ gridArea: { xs: 'publish' } }}>
              {publish}
            </Box>
          ) : null}
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
