import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { DiscoverySlider } from './DiscoverySlider'
import { DISCOVERY_LEVEL_MAX_HOPS, DISCOVERY_LEVELS, type DiscoveryLevel } from './discoveryLevels'

function StatefulDiscoverySlider({ initial = 'network' }: { initial?: DiscoveryLevel }) {
  const [level, setLevel] = useState<DiscoveryLevel>(initial)
  return <DiscoverySlider value={level} onChange={setLevel} />
}

describe('DiscoverySlider', () => {
  it('renders the three discovery stops in order with labels', () => {
    render(<DiscoverySlider value="network" onChange={vi.fn()} />)

    expect(screen.getByText('My network')).toBeInTheDocument()
    expect(screen.getByText('+1 hop')).toBeInTheDocument()
    expect(screen.getByText('Anyone')).toBeInTheDocument()
  })

  it('emits the matching discovery level when the slider value changes', () => {
    render(<StatefulDiscoverySlider />)

    const input = screen.getByRole('slider') as HTMLInputElement

    fireEvent.change(input, { target: { value: '2' } })
    expect(input).toHaveValue('2')

    fireEvent.change(input, { target: { value: '1' } })
    expect(input).toHaveValue('1')

    fireEvent.change(input, { target: { value: '0' } })
    expect(input).toHaveValue('0')
  })

  it('reflects the supplied value in the underlying input', () => {
    render(<DiscoverySlider value="one-hop" onChange={vi.fn()} />)
    expect(screen.getByRole('slider')).toHaveValue('1')
  })

  it('disables the slider and shows a sign-in helper hint when disabled', () => {
    render(<DiscoverySlider value="network" onChange={vi.fn()} disabled />)

    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByText(/Sign in and build a trust network to filter/i)).toBeInTheDocument()
  })

  it('maps levels to maxHops with anyone unfiltered', () => {
    expect(DISCOVERY_LEVEL_MAX_HOPS.network).toBe(1)
    expect(DISCOVERY_LEVEL_MAX_HOPS['one-hop']).toBe(2)
    expect(DISCOVERY_LEVEL_MAX_HOPS.anyone).toBeUndefined()
    expect(DISCOVERY_LEVELS).toEqual(['network', 'one-hop', 'anyone'])
  })
})
