import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AlignmentTrustGate } from './AlignmentTrustGate'

vi.mock('@ui/shared', () => ({
  notifySubjectivTrustNetworkInvalidated: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}))

vi.mock('../lib/useMachinery', () => ({
  useMachinery: () => ({ eventCacheUrl: 'http://localhost:42069' }),
}))

vi.mock('../lib/useWriteClients', () => ({
  useWriteClients: () => null,
}))

afterEach(cleanup)

describe('AlignmentTrustGate', () => {
  it('explains that the starter network is unavailable, not that the cause needs attestation', () => {
    render(
      <MemoryRouter>
        <AlignmentTrustGate />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('alignment-trust-gate')).toHaveTextContent(
      /no project-vouching network is available/i,
    )
    expect(screen.getByTestId('alignment-trust-gate')).toHaveTextContent(
      /not an attestation of this cause/i,
    )
    expect(screen.getByRole('link', { name: /open trust settings/i })).toHaveAttribute(
      'href',
      '/settings',
    )
  })
})
