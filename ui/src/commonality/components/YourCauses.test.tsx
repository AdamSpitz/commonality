import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CauseDraft } from '../lib/causeStore'
import { YourCauses } from './YourCauses'

const ORGANIZER = '0x1111111111111111111111111111111111111111'
const VISITOR = '0x2222222222222222222222222222222222222222'

vi.mock('wagmi', () => ({ useAccount: () => ({ address: ORGANIZER, isConnected: true }) }))

function board(id: string, title: string, owner?: string): CauseDraft {
  return {
    id,
    title,
    planks: owner ? [{ id: `${id}-plank`, text: title, origin: 'user', cid: `${id}-cid` }] : [],
    founderAddress: owner,
    slug: owner ? id : undefined,
    rosterCid: owner ? `${id}-roster` : undefined,
    createdAt: `2026-01-0${id.length}T00:00:00.000Z`,
    updatedAt: `2026-02-0${id.length}T00:00:00.000Z`,
  }
}

const causes = [
  board('mine', 'My published board', ORGANIZER),
  board('kept', 'A bookmarked board', VISITOR),
  board('draft', 'An unfinished draft'),
]

describe('YourCauses', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  afterEach(cleanup)

  it('separates owned, bookmarked, and draft boards and filters the current view', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><YourCauses causes={causes} loading={false} /></MemoryRouter>)

    await user.click(screen.getByRole('tab', { name: 'Organizing 1' }))
    expect(screen.getByText('My published board')).toBeInTheDocument()
    expect(screen.queryByText('A bookmarked board')).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Saved 1' }))
    expect(screen.getByText('A bookmarked board')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Filter your cause boards'), 'missing')
    expect(screen.getByText('No cause boards match that filter.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Filter your cause boards'))
    await user.click(screen.getByRole('tab', { name: 'Drafts 1' }))
    expect(screen.getByText('An unfinished draft')).toBeInTheDocument()
  })

  it('archives an owned board and restores it from the archived view', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><YourCauses causes={causes} loading={false} /></MemoryRouter>)

    await user.click(screen.getByRole('tab', { name: 'Organizing 1' }))
    await user.click(screen.getByRole('button', { name: 'Actions for My published board' }))
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }))

    expect(screen.getByRole('tab', { name: 'Organizing 0' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Archived 1' }))
    expect(screen.getByText('My published board')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for My published board' }))
    await user.click(screen.getByRole('menuitem', { name: 'Restore from archive' }))
    expect(screen.getByRole('tab', { name: 'Archived 0' })).toBeInTheDocument()
  })

  it('removes a bookmark through the supplied persistence action', async () => {
    const removeBookmark = vi.fn()
    const user = userEvent.setup()
    render(<MemoryRouter><YourCauses causes={causes} loading={false} removeBookmark={removeBookmark} /></MemoryRouter>)

    await user.click(screen.getByRole('tab', { name: 'Saved 1' }))
    await user.click(screen.getByRole('button', { name: 'Actions for A bookmarked board' }))
    await user.click(screen.getByRole('menuitem', { name: 'Remove bookmark' }))

    expect(removeBookmark).toHaveBeenCalledWith(causes[1])
    expect(screen.getByRole('tab', { name: 'Saved 0' })).toBeInTheDocument()
  })

  it('keeps the home-page version short and links to the full collection', () => {
    const many = Array.from({ length: 7 }, (_, index) => board(`saved-${index}`, `Board ${index}`, VISITOR))
    render(<MemoryRouter><YourCauses causes={many} loading={false} compact /></MemoryRouter>)
    expect(screen.getAllByText(/^Board \d$/)).toHaveLength(5)
    expect(screen.getByRole('link', { name: 'See all 7 cause boards' })).toHaveAttribute('href', '/causes')
  })
})
