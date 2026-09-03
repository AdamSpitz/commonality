import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CauseBoardLayout } from './CauseBoardLayout'

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
    expect(screen.queryByTestId('cause-board-rail')).toBeNull()
  })
})
