import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk'
import { TRUSTED_NUDGERS_KEY } from '../../shared/hooks/useTrustedNudgers'
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

    expect(screen.getByRole('heading', { name: /opt in to the csm mediator/i })).toBeInTheDocument()
    expect(screen.getByText(/the only consequence is that Tally may show you suggestions/i)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /do not show mediator suggestions/i })).not.toBeChecked()
  })

  it('adds and removes the mediator from trusted nudgers', async () => {
    const user = userEvent.setup()
    renderLandingPage()

    const toggle = screen.getByRole('switch', { name: /do not show mediator suggestions/i })
    await user.click(toggle)

    expect(toggle).toBeChecked()
    expect(JSON.parse(localStorage.getItem(TRUSTED_NUDGERS_KEY)!)).toEqual([
      expect.objectContaining({ address: LOCAL_CSM_MEDIATOR_ADDRESS, sourceType: 'bridge-creator' }),
    ])

    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(JSON.parse(localStorage.getItem(TRUSTED_NUDGERS_KEY)!)).toEqual([])
  })

  it('renders mission-statement-first CSM destinations', () => {
    renderLandingPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sane majority needs infrastructure/i)
    expect(screen.getAllByText(CSM_MISSION_STATEMENT_TEXT).length).toBeGreaterThan(0)
    expectLinkHrefContaining(`domain=tally&path=%2Fstatement%2F${CSM_MISSION_STATEMENT_CID}`)
    expectLinkHrefContaining(`domain=alignment&path=%2Fportal%2F${CSM_MISSION_STATEMENT_CID}`)
    expectLinkHrefContaining('/docs/common-sense-majority/mission-statement')
  })
})
