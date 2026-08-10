import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlankRow } from './PlankRow'

afterEach(cleanup)

vi.mock('./SupportButton', () => ({
  SupportButton: () => <button type="button">Support</button>,
}))

function renderDraft(publishing: boolean, mutationLocked = false) {
  const handlers = {
    onTextChange: vi.fn(),
    onDelete: vi.fn(),
    onSharpen: vi.fn(),
    onPublish: vi.fn(),
  }
  render(
    <MemoryRouter>
      <PlankRow
        plank={{ id: 'plank', text: 'Repair every streetlight.', origin: 'user' }}
        index={0}
        selected={false}
        onSelectedChange={vi.fn()}
        support={undefined}
        supportLoading={false}
        projectCount={0}
        onSupported={vi.fn()}
        {...handlers}
        sharpening={false}
        publishing={publishing}
        mutationLocked={mutationLocked}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('PlankRow', () => {
  it('disables editing, sharpening, and deletion while publication is pending', () => {
    const handlers = renderDraft(true)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /help make this attestable/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /remove issue 1/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /remove issue 1/i }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
  })

  it('locks this draft while another cause mutation is pending', () => {
    const handlers = renderDraft(false, true)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /publish issue/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /help make this attestable/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /remove issue 1/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /remove issue 1/i }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
  })
})
