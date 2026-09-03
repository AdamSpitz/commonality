import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfoChip, InfoLabel } from './InfoChip'

describe('InfoChip', () => {
  it('renders the label and a trailing info icon', () => {
    render(<InfoChip title="What this means" label="Succeeded" />)
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeTruthy()
  })
})

describe('InfoLabel', () => {
  it('renders children and a trailing info icon', () => {
    render(<InfoLabel title="No funding floor">No minimum</InfoLabel>)
    expect(screen.getByText('No minimum')).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeTruthy()
  })
})
