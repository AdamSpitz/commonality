import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MediatorOptInBlock } from './MediatorOptInBlock'

describe('MediatorOptInBlock', () => {
  it('renders parameterized cause identity and deep link', () => {
    render(<MediatorOptInBlock
      mediator={{
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        name: 'Housing mediator',
        description: 'Bridges homeowners and renters.',
        serviceUrl: 'https://housing.example',
      }}
      heading="Opt in to the housing mediator"
      tallyUrl={(path) => `https://tally.example${path}`}
    />)
    expect(screen.getByRole('region', { name: 'Opt in to the housing mediator' })).toBeInTheDocument()
    expect(screen.getByText('Bridges homeowners and renters.', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /opt in on tally/i })).toHaveAttribute('href', expect.stringContaining('nudgerName=Housing+mediator'))
  })
})
