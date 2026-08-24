import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ClusterMediatorOptIn, clusterMediatorOptInPath } from './ClusterMediatorOptIn'

const fields = {
  mediatorAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
  mediatorName: 'Ada Mediator',
  mediatorNote: 'Hand-authored settlement.',
}

describe('ClusterMediatorOptIn', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('opts in to the mediator address with no service URL', () => {
    render(<ClusterMediatorOptIn fields={fields} />)

    const button = screen.getByTestId('cluster-mediator-optin')
    expect(button).toHaveTextContent('Opt in')
    expect(button).not.toBeDisabled()

    fireEvent.click(button)
    expect(button).toHaveTextContent('Opted in')
    const stored = JSON.parse(localStorage.getItem('commonality:trustedNudgers') ?? '[]') as Array<{
      address: string
      serviceUrl?: string
      sourceType?: string
      name: string
    }>
    expect(stored).toHaveLength(1)
    expect(stored[0]?.address).toBe(fields.mediatorAddress)
    expect(stored[0]?.name).toBe('Ada Mediator')
    expect(stored[0]?.serviceUrl).toBeUndefined()
    expect(stored[0]?.sourceType).toBeUndefined()
  })

  it('does not treat opening the cluster as subscribe — starts off', () => {
    render(<ClusterMediatorOptIn fields={fields} />)
    expect(screen.getByTestId('cluster-mediator-optin')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/not this page/i)).toBeInTheDocument()
  })

  it('deep-links to Settings without a service URL', () => {
    const path = clusterMediatorOptInPath(fields)
    const url = new URL(path, 'https://causestarter.example')
    expect(url.searchParams.get('addNudger')).toBe(fields.mediatorAddress)
    expect(url.searchParams.get('nudgerName')).toBe('Ada Mediator')
    expect(url.searchParams.has('nudgerServiceUrl')).toBe(false)
  })
})
