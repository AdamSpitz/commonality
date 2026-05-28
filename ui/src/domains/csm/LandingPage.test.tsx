import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk'
import { CsmLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

function expectLinkHrefContaining(hrefPart: string) {
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href')?.includes(hrefPart))).toBe(true)
}

describe('CsmLandingPage', () => {
  it('renders mission-statement-first CSM destinations', () => {
    render(<CsmLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sane majority needs infrastructure/i)
    expect(screen.getAllByText(CSM_MISSION_STATEMENT_TEXT).length).toBeGreaterThan(0)
    expectLinkHrefContaining(`domain=tally&path=%2Fstatement%2F${CSM_MISSION_STATEMENT_CID}`)
    expectLinkHrefContaining(`domain=alignment&path=%2Fportal%2F${CSM_MISSION_STATEMENT_CID}`)
    expectLinkHrefContaining('/docs/common-sense-majority/mission-statement')
  })
})
