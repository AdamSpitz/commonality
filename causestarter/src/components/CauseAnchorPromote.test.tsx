import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CauseAnchorPromote } from './CauseAnchorPromote'

afterEach(cleanup)

const anchors = [
  { combinator: 'any' as const, cid: 'bafkreiany', operandCids: ['bafyA', 'bafyB'] },
  { combinator: 'all' as const, cid: 'bafkreiall', operandCids: ['bafyA', 'bafyB'] },
]

describe('CauseAnchorPromote', () => {
  it('hides until at least two statements are selected', () => {
    const { container } = render(
      <CauseAnchorPromote
        selectedCids={['bafyA']}
        canPromote
        promoting={null}
        error={null}
        anchors={undefined}
        onPromote={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('offers both promotions and shows handles minted from this selection', () => {
    render(
      <CauseAnchorPromote
        selectedCids={['bafyB', 'bafyA']}
        canPromote
        promoting={null}
        error={null}
        anchors={anchors}
        onPromote={vi.fn()}
      />,
    )
    // Selection order and duplicates must not change which anchor matches.
    expect(screen.getByTestId('anchor-cid-any')).toHaveTextContent('bafkreiany')
    expect(screen.getByTestId('anchor-cid-all')).toHaveTextContent('bafkreiall')
    expect(screen.getByTestId('promote-any')).toBeDisabled()
  })

  it('hides handles minted from a different selection', () => {
    render(
      <CauseAnchorPromote
        selectedCids={['bafyA', 'bafyC']}
        canPromote
        promoting={null}
        error={null}
        anchors={anchors}
        onPromote={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('anchor-cid-any')).not.toBeInTheDocument()
    expect(screen.queryByTestId('anchor-cid-all')).not.toBeInTheDocument()
    expect(screen.getByTestId('promote-any')).toBeEnabled()
    expect(screen.getByTestId('promote-all')).toBeEnabled()
  })
})
