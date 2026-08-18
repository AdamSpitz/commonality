import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CauseMediatorCard, causeMediatorOptInPath } from './CauseMediatorCard'

const mediator = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  serviceUrl: 'https://housing.example/mediator',
  name: 'Housing mediator',
  description: 'Bridges homeowners and renters.',
}

describe('CauseMediatorCard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ anchors: [{ id: 'common', role: 'common-ground', text: 'Stable and abundant housing matters.', topic_tag: 'housing' }] }),
    }))
  })

  it('uses this cause’s mediator metadata and service rather than CSM', async () => {
    render(
      <MemoryRouter>
        <CauseMediatorCard mediator={mediator} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Housing mediator' })).toBeInTheDocument()
    expect(await screen.findByText('Stable and abundant housing matters.')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('https://housing.example/mediator/anchors?featured=true')
    const path = causeMediatorOptInPath(mediator)
    expect(path).toContain('nudgerName=Housing+mediator')
    expect(path).not.toContain('Common+Sense+Majority')
    const optIn = screen.getByRole('link', { name: 'Opt in to this mediator' })
    expect(optIn).toHaveAttribute('href', path)
  })
})
