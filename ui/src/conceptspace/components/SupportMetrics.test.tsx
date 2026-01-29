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

  it('displays direct believers count', () => {
    render(
      <SupportMetrics
        directBelievers={5}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('5 direct believers')).toBeInTheDocument()
  })

  it('uses singular form when count is 1', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('1 direct believer')).toBeInTheDocument()
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

    expect(screen.queryByText(/disbeliever/)).not.toBeInTheDocument()
  })

  it('shows disbelievers section when count is greater than 0', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={2}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('2 disbelievers')).toBeInTheDocument()
  })
})
