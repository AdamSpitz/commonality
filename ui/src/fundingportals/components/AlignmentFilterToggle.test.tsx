import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AlignmentFilterToggle } from './AlignmentFilterToggle'
import type { AlignmentFilter } from './alignmentFilter'

function StatefulToggle({ initial = 'all' }: { initial?: AlignmentFilter }) {
  const [value, setValue] = useState<AlignmentFilter>(initial)
  return <AlignmentFilterToggle value={value} onChange={setValue} />
}

describe('AlignmentFilterToggle', () => {
  it('offers All and Direct only, not Indirect', () => {
    render(<AlignmentFilterToggle value="all" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Direct only' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Indirect' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Direct' })).toBeNull()
  })

  it('emits direct when Direct only is selected', () => {
    const onChange = vi.fn()
    render(<AlignmentFilterToggle value="all" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Direct only' }))
    expect(onChange).toHaveBeenCalledWith('direct')
  })

  it('marks the supplied value as pressed', () => {
    render(<StatefulToggle initial="direct" />)
    expect(screen.getByRole('button', { name: 'Direct only' })).toHaveAttribute('aria-pressed', 'true')
  })
})
