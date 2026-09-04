import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CauseBoardLayout, causeBoardGridSx } from './CauseBoardLayout'

describe('CauseBoardLayout', () => {
  it('keeps one page tree with named regions', () => {
    render(
      <CauseBoardLayout
        chrome={<div>chrome</div>}
        header={<div>header</div>}
        statements={<div>statements</div>}
        rest={<div>rest</div>}
      />,
    )
    expect(screen.getByTestId('cause-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('cause-board-chrome')).toHaveTextContent('chrome')
    expect(screen.getByTestId('cause-board-header')).toHaveTextContent('header')
    expect(screen.getByTestId('cause-board-main')).toHaveTextContent('statements')
    expect(screen.getByTestId('cause-board-rest')).toHaveTextContent('rest')
    expect(screen.getByTestId('cause-board-rail')).toContainElement(screen.getByTestId('cause-board-chrome'))
  })

  it('omits the rail when chrome, funding, and publish are empty', () => {
    render(
      <CauseBoardLayout
        header={<div>header</div>}
        statements={<div>statements</div>}
      />,
    )
    expect(screen.queryByTestId('cause-board-rail')).toBeNull()
  })

  it('packs chrome, funding, and publish into one md rail column', () => {
    const withRail = causeBoardGridSx(true)
    const withoutRail = causeBoardGridSx(false)
    expect(withRail.gridTemplateColumns.md).toBe('minmax(0, 1fr) minmax(260px, 320px)')
    expect(withoutRail.gridTemplateColumns.md).toBe('minmax(0, 1fr)')
    expect(withRail.gridTemplateAreas.md).toMatch(/"header rail"/)
    expect(withRail.gridTemplateAreas.md).toMatch(/"statements rail"/)
    expect(withRail.gridTemplateAreas.md).not.toMatch(/chrome/)
    expect(withoutRail.gridTemplateAreas.md).not.toMatch(/rail/)
  })
})
