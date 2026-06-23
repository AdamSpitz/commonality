import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk'
import { TRUSTED_NUDGERS_KEY } from '../../shared'
import { CsmLandingPage } from './LandingPage'

const LOCAL_CSM_MEDIATOR_ADDRESS = '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955'

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <CsmLandingPage />
    </MemoryRouter>,
  )
}

function expectLinkHrefContaining(hrefPart: string) {
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href')?.includes(hrefPart))).toBe(true)
}

function getMediatorOptInRegion() {
  return screen.getByRole('region', { name: /opt in to the csm mediator/i })
}

function getMediatorSuggestionsSwitch() {
  return within(getMediatorOptInRegion()).getByRole('switch')
}

describe('CsmLandingPage mediator opt-in', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_DEFAULT_NUDGERS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('surfaces the mediator opt-in control in the hero', () => {
    renderLandingPage()

    const mediatorOptIn = getMediatorOptInRegion()

    expect(within(mediatorOptIn).getByRole('heading', { name: /opt in to the csm mediator/i })).toBeInTheDocument()
    expect(within(mediatorOptIn).getByText(/the only consequence is that Tally may show you suggestions/i)).toBeInTheDocument()
    expect(getMediatorSuggestionsSwitch()).not.toBeChecked()
  })

  it('adds and removes the mediator from trusted nudgers', async () => {
    const user = userEvent.setup()
    renderLandingPage()

    const toggle = getMediatorSuggestionsSwitch()
    await user.click(toggle)

    expect(toggle).toBeChecked()
    expect(JSON.parse(localStorage.getItem(TRUSTED_NUDGERS_KEY)!)).toEqual([
      expect.objectContaining({ address: LOCAL_CSM_MEDIATOR_ADDRESS, sourceType: 'bridge-creator' }),
    ])

    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(JSON.parse(localStorage.getItem(TRUSTED_NUDGERS_KEY)!)).toEqual([])
  })

  it('renders real post-opt-in CSM destinations', () => {
    renderLandingPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sane majority needs infrastructure/i)
    expect(screen.getAllByText(CSM_MISSION_STATEMENT_TEXT).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /enable mediator suggestions in tally/i })).toHaveAttribute(
      'href',
      expect.stringContaining(`domain=tally&path=%2Fsettings%3FaddNudger%3D${LOCAL_CSM_MEDIATOR_ADDRESS}`),
    )
    expect(screen.getByRole('link', { name: /browse csm-aligned work/i })).toHaveAttribute(
      'href',
      expect.stringContaining(`domain=alignment&path=%2Fportal%2F${CSM_MISSION_STATEMENT_CID}`),
    )
    expect(screen.getByRole('heading', { name: /see common-ground bridges in action/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse csm bridges/i })).toHaveAttribute('href', '/bridges')
    expectLinkHrefContaining(`addNudger=${LOCAL_CSM_MEDIATOR_ADDRESS}`)
  })
})
