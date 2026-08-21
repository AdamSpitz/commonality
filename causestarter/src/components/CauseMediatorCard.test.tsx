import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CauseMediatorCard, causeMediatorOptInPath } from './CauseMediatorCard'

const mediator = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  serviceUrl: 'https://housing.example/mediator',
  name: 'Housing mediator',
  description: 'Bridges homeowners and renters.',
}

const detailPath = '/cause/0x1111111111111111111111111111111111111111/housing/mediator'

function renderCard(config = mediator) {
  render(
    <MemoryRouter>
      <CauseMediatorCard mediator={config} detailPath={detailPath} />
    </MemoryRouter>,
  )
}

describe('CauseMediatorCard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('stays compact: identity and a link out, never the mediator’s statements', () => {
    renderCard()

    expect(screen.getByText('Housing mediator')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'see what it proposes' }))
      .toHaveAttribute('href', detailPath)
    // The anchors service belongs to the detail page; the card must not fetch.
    expect(fetch).not.toHaveBeenCalled()
  })

  it('toggles opting in, and reports the current state on the button', () => {
    renderCard()

    const button = screen.getByTestId('cause-mediator-optin')
    expect(button).toHaveTextContent('Opt in')
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(button).toHaveTextContent('Opted in')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('commonality:trustedNudgers')).toContain(mediator.address)

    fireEvent.click(button)
    expect(button).toHaveTextContent('Opt in')
    expect(localStorage.getItem('commonality:trustedNudgers')).not.toContain(mediator.address)
  })

  it('reflects an opt-in made elsewhere in this client', () => {
    localStorage.setItem('commonality:trustedNudgers', JSON.stringify([{
      address: mediator.address,
      name: mediator.name,
      description: mediator.description,
      serviceUrl: mediator.serviceUrl,
    }]))

    renderCard()

    expect(screen.getByTestId('cause-mediator-optin')).toHaveTextContent('Opted in')
  })

  it('cannot be enabled when the published identity is incomplete', () => {
    renderCard({ ...mediator, address: 'not-an-address' })

    expect(screen.getByTestId('cause-mediator-optin')).toBeDisabled()
    expect(screen.getByText(/published identity is incomplete/)).toBeInTheDocument()
  })

  it('cannot be enabled without a service URL (featured triples need GET /anchors)', () => {
    renderCard({ ...mediator, serviceUrl: '' })

    expect(screen.getByTestId('cause-mediator-optin')).toBeDisabled()
    expect(screen.getByText(/published identity is incomplete/)).toBeInTheDocument()
  })

  it('still offers a deep link for clients that cannot toggle in place', () => {
    const path = causeMediatorOptInPath(mediator)
    expect(path).toContain('nudgerName=Housing+mediator')
    expect(path).toContain('nudgerServiceUrl=https%3A%2F%2Fhousing.example%2Fmediator')
    expect(path).not.toContain('Common+Sense+Majority')
  })

  it('does not deep-link an incomplete mediator into settings', () => {
    expect(causeMediatorOptInPath({ ...mediator, serviceUrl: '' })).toBe('/settings')
  })
})
