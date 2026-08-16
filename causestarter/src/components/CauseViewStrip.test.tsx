import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CauseViewStrip } from './CauseViewStrip'

afterEach(cleanup)

describe('CauseViewStrip', () => {
  it('shows both counts without a toggle, and hides band 2 for one plank', () => {
    render(
      <CauseViewStrip
        counts={{
          plankCount: 1,
          union: { direct: 1, total: 1 },
          conjunction: { signedAll: 1, noneDisagreed: 0 },
        }}
        selectedCount={1}
        loading={false}
        fewestDirectSignatures={undefined}
      />,
    )

    expect(screen.getByTestId('cause-view-strip')).toHaveTextContent(
      '1 user signed at least one of the selected statements',
    )
    expect(screen.getByTestId('cause-view-strip')).toHaveTextContent(
      '1 user signed all of the selected statements',
    )
    expect(screen.queryByRole('button', { name: /signed any/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/never asked about the rest/i)).not.toBeInTheDocument()
  })

  const sevenPlanks = {
    plankCount: 7,
    union: { direct: 4000, total: 4210 },
    // The roster's seventh plank is new, so nobody has disagreed with it and
    // everyone who signed the first six is still counted here.
    conjunction: { signedAll: 310, noneDisagreed: 1840 },
  }

  it('pairs band 2 with the weakest link, so a plank nobody signed stays visible', () => {
    render(
      <CauseViewStrip
        counts={sevenPlanks}
        selectedCount={7}
        loading={false}
        fewestDirectSignatures={3}
      />,
    )

    expect(screen.getByTestId('cause-view-strip')).toHaveTextContent(
      '4,210 users signed at least one of the selected statements',
    )
    expect(screen.getByTestId('cause-view-strip')).toHaveTextContent(
      '310 users signed all of the selected statements',
    )
    expect(screen.getByTestId('view-count-none-disagreed')).toHaveTextContent('1,840')
    expect(screen.getByTestId('view-fewest-signatures')).toHaveTextContent('3')
  })

  it('withholds band 2 when the weakest link is unknown, rather than showing it alone', () => {
    // A plank whose counts failed to load would make the minimum over the rest
    // report too high a floor — precisely hiding the plank in question.
    render(
      <CauseViewStrip
        counts={sevenPlanks}
        selectedCount={7}
        loading={false}
        fewestDirectSignatures={undefined}
      />,
    )

    expect(screen.getByTestId('view-count-all')).toHaveTextContent('310')
    expect(screen.queryByTestId('view-count-none-disagreed')).not.toBeInTheDocument()
    expect(screen.queryByTestId('view-fewest-signatures')).not.toBeInTheDocument()
  })
})
