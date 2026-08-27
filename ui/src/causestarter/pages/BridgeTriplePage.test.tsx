import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BridgeTriplePage } from './BridgeTriplePage'

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>()
  return {
    ...actual,
    useAccount: () => ({ address: undefined, isConnected: false }),
    useConnect: () => ({ connectAsync: vi.fn(), connectors: [], isPending: false }),
    useDisconnect: () => ({ disconnectAsync: vi.fn() }),
  }
})

vi.mock('@ui/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ui/shared')>()
  return {
    ...actual,
    useMachinery: () => ({}),
    useWriteClients: () => null,
  }
})

describe('BridgeTriplePage', () => {
  afterEach(() => {
    cleanup()
  })

  it('is a human authoring surface: no service URL, cluster is the other form', () => {
    render(
      <MemoryRouter>
        <BridgeTriplePage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('bridge-triple-page')).toBeInTheDocument()
    expect(screen.getByTestId('triple-publish-statements')).toBeInTheDocument()
    expect(screen.getByText(/No/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cause cluster/i })).toHaveAttribute('href', '/bridge/new')
    expect(screen.queryByTestId('cluster-mediator-optin')).not.toBeInTheDocument()
    expect(screen.getByTestId('triple-publish-nudges')).toBeDisabled()
  })
})
