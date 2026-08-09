import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BridgeDisplayBlock, type MediatorBridgeAnchor } from './BridgeDisplayBlock'

const anchor = (role: string, text: string): MediatorBridgeAnchor => ({
  id: role, cluster_id: 'housing', role, text, tally_cid: null, topic_tag: 'housing', rationale: 'fixture',
  status: 'active', featured: true, created_at: '2026-01-01T00:00:00.000Z', last_reviewed_at: '2026-01-01T00:00:00.000Z',
})
const fallback = [anchor('side-a', 'Fallback owner view'), anchor('side-b', 'Fallback renter view'), anchor('common-ground', 'Fallback common ground')]
const live = [anchor('side-a', 'Live maintainer view'), anchor('side-b', 'Live user view'), anchor('common-ground', 'Live common ground')]

describe('BridgeDisplayBlock', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('renders the bundled fallback without requiring a deployed mediator', () => {
    render(<BridgeDisplayBlock fallbackAnchors={fallback} labels={{ sideA: 'Owners', sideB: 'Renters' }} statementHref={() => '/statement'} />)
    expect(screen.getByText('Fallback common ground')).toBeInTheDocument()
    expect(screen.getByText('Owners starting point')).toBeInTheDocument()
  })

  it('fetches live featured anchors cross-origin when a service URL is configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ anchors: live }) }))
    render(<BridgeDisplayBlock serviceUrl="https://mediator.example" fallbackAnchors={fallback} labels={{ sideA: 'Maintainers', sideB: 'Users' }} statementHref={() => '/statement'} />)
    expect(await screen.findByText('Live common ground')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('https://mediator.example/anchors?featured=true', { cache: 'no-store' })
  })

  it('uses fallback content when the live response contains malformed anchors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ anchors: [{ id: 'broken' }] }) }))
    render(<BridgeDisplayBlock serviceUrl="https://mediator.example" fallbackAnchors={fallback} labels={{ sideA: 'Owners', sideB: 'Renters' }} statementHref={() => '/statement'} />)
    expect(await screen.findByText(/live mediator bridges are unavailable/i)).toBeInTheDocument()
    expect(screen.getByText('Fallback common ground')).toBeInTheDocument()
  })

  it('retains useful fallback content when the configured service is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<BridgeDisplayBlock serviceUrl="https://mediator.example" fallbackAnchors={fallback} labels={{ sideA: 'Owners', sideB: 'Renters' }} statementHref={() => '/statement'} />)
    expect(screen.getByText('Fallback common ground')).toBeInTheDocument()
    expect(await screen.findByText(/live mediator bridges are unavailable/i)).toBeInTheDocument()
  })
})
