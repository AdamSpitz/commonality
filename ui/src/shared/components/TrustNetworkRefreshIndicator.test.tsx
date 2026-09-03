import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrustNetworkRefreshIndicator } from './TrustNetworkRefreshIndicator'

describe('TrustNetworkRefreshIndicator', () => {
  it('exposes the explanation as an accessible label without the full banner text in flow', () => {
    render(
      <div style={{ position: 'relative' }}>
        <TrustNetworkRefreshIndicator title="Refreshing your trust network. Currently using 2 accounts in your network." />
        <p>Page content</p>
      </div>,
    )

    expect(
      screen.getByLabelText(/Refreshing your trust network. Currently using 2 accounts/),
    ).toBeInTheDocument()
    expect(screen.getByTestId('trust-network-refresh')).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })
})
