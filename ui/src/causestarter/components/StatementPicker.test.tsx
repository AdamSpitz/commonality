import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { StatementPicker } from './StatementPicker'

const { browseStatements, atomizeCause } = vi.hoisted(() => ({
  browseStatements: vi.fn(),
  atomizeCause: vi.fn(),
}))

vi.mock('@commonality/sdk/conceptspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@commonality/sdk/conceptspace')>()
  return {
    ...actual,
    browseStatements,
    getStatementWithContent: vi.fn(),
  }
})

vi.mock('@commonality/sdk/nudger-publications', () => ({
  getCuratedCollections: vi.fn().mockResolvedValue([]),
}))

vi.mock('../lib/causeAssistClient', () => ({ atomizeCause }))

vi.mock('../../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared')>()
  return {
    ...actual,
    useMachinery: () => ({}),
  }
})

describe('StatementPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    browseStatements.mockResolvedValue([])
    atomizeCause.mockResolvedValue({
      source: 'llm',
      planks: [
        { text: 'Repair every broken crossing signal near local schools.', rationale: 'Specific outcome.' },
        { text: 'Add raised crossings outside local schools.', rationale: 'Distinct intervention.' },
      ],
    })
  })

  it('lets an organizer reject every drafted suggestion and correct their intent', async () => {
    const onSelect = vi.fn()
    render(
      <StatementPicker
        intent="cause"
        machinery={{} as SDKMachinery}
        existingCids={[]}
        onSelect={onSelect}
      />,
    )

    const intent = screen.getByTestId('statement-picker-intent')
    fireEvent.change(intent, { target: { value: 'Make school journeys safer' } })
    fireEvent.click(screen.getByTestId('statement-picker-search'))
    fireEvent.click(await screen.findByTestId('statement-picker-none-fit'))

    expect(await screen.findByText('Repair every broken crossing signal near local schools.')).toBeVisible()
    expect(screen.getByText('Add raised crossings outside local schools.')).toBeVisible()

    const rejectButtons = screen.getAllByRole('button', { name: 'Not what I mean' })
    fireEvent.click(rejectButtons[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Not what I mean' }))

    await waitFor(() => {
      expect(screen.queryByText('Repair every broken crossing signal near local schools.')).not.toBeInTheDocument()
      expect(screen.queryByText('Add raised crossings outside local schools.')).not.toBeInTheDocument()
    })
    expect(onSelect).not.toHaveBeenCalled()

    fireEvent.change(intent, { target: { value: 'Focus only on safer walking routes' } })
    fireEvent.click(screen.getByTestId('statement-picker-search'))
    await waitFor(() => expect(browseStatements).toHaveBeenCalledTimes(2))
    expect(intent).toHaveValue('Focus only on safer walking routes')
  })
})
