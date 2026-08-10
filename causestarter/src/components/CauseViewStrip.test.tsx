import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CauseViewStrip } from './CauseViewStrip'

describe('CauseViewStrip', () => {
  it('does not describe unasked remaining issues for a one-plank conjunction', () => {
    render(
      <CauseViewStrip
        mode="all"
        onModeChange={vi.fn()}
        counts={{
          plankCount: 1,
          union: { direct: 1, total: 1 },
          conjunction: { signedAll: 1, noneDisagreed: 0 },
        }}
        selectedCount={1}
        publishedCount={1}
        loading={false}
      />,
    )

    expect(screen.getByText(/signed this issue/i)).toBeInTheDocument()
    expect(screen.queryByText(/never asked about the rest/i)).not.toBeInTheDocument()
  })
})
