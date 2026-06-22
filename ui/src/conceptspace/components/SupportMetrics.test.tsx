import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SupportMetrics } from './SupportMetrics'

describe('SupportMetrics', () => {
  it('displays total supporters as sum of direct believers and indirect supporters', () => {
    render(
      <SupportMetrics
        directBelievers={3}
        directDisbelievers={0}
        indirectSupporters={7}
      />,
    )

    expect(screen.getByText('10 supporters')).toBeInTheDocument()
  })

  it('explains direct vs indirect support instead of showing a magical aggregate', () => {
    render(
      <SupportMetrics
        directBelievers={3}
        directDisbelievers={0}
        indirectSupporters={7}
      />,
    )

    expect(screen.getByText(/direct signers signed this exact statement/i)).toBeInTheDocument()
    expect(screen.getByText(/signed a different statement/i)).toBeInTheDocument()
    expect(screen.getByText(/trusted statement-connection sources/i)).toBeInTheDocument()
  })

  it('displays direct believers count', () => {
    render(
      <SupportMetrics
        directBelievers={5}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('5 signers')).toBeInTheDocument()
  })

  it('uses singular form when count is 1', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('1 signer')).toBeInTheDocument()
    expect(screen.getByText('1 supporter')).toBeInTheDocument()
  })

  it('hides disbelievers section when count is 0', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.queryByText(/opposing signer/)).not.toBeInTheDocument()
  })

  it('shows disbelievers section when count is greater than 0', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={2}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('2 opposing signers')).toBeInTheDocument()
  })
})
