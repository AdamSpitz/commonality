import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CauseAnchorPromote } from './CauseAnchorPromote'

afterEach(cleanup)

describe('CauseAnchorPromote', () => {
  it('hides until at least two statements are selected', () => {
    const { container } = render(
      <CauseAnchorPromote
        selectedCount={1}
        canPromote
        promoting={null}
        error={null}
        anchors={undefined}
        onPromote={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('offers both promotions and shows published handles', () => {
    render(
      <CauseAnchorPromote
        selectedCount={3}
        canPromote
        promoting={null}
        error={null}
        anchors={{ any: 'bafkreiany', all: 'bafkreiall' }}
        onPromote={vi.fn()}
      />,
    )
    expect(screen.getByTestId('promote-any')).toHaveTextContent('Promote as any of these')
    expect(screen.getByTestId('promote-all')).toHaveTextContent('Promote as all of these')
    expect(screen.getByTestId('anchor-cid-any')).toHaveTextContent('bafkreiany')
    expect(screen.getByTestId('anchor-cid-all')).toHaveTextContent('bafkreiall')
  })
})
