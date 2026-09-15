import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CauseConjunctionEarmark } from './CauseConjunctionEarmark'

describe('CauseConjunctionEarmark', () => {
  afterEach(() => cleanup())

  it('asks for two statements before offering the action', () => {
    render(
      <CauseConjunctionEarmark
        selectedCount={1}
        walletReady
        creating={false}
        error={null}
        onEarmark={() => {}}
      />,
    )
    expect(screen.getByTestId('conjunction-earmark')).toBeInTheDocument()
    expect(screen.queryByTestId('earmark-conjunction')).not.toBeInTheDocument()
    expect(screen.getByText(/Check at least two statements/)).toBeInTheDocument()
  })

  it('offers earmark when two or more are selected', async () => {
    const onEarmark = vi.fn()
    render(
      <CauseConjunctionEarmark
        selectedCount={3}
        walletReady
        creating={false}
        error={null}
        onEarmark={onEarmark}
      />,
    )
    const button = screen.getByTestId('earmark-conjunction')
    expect(button).toHaveTextContent('Earmark for all 3 selected')
    fireEvent.click(button)
    expect(onEarmark).toHaveBeenCalledOnce()
  })

  it('still shows the action when the wallet is not ready, with connect copy', () => {
    render(
      <CauseConjunctionEarmark
        selectedCount={2}
        walletReady={false}
        creating={false}
        error={null}
        onEarmark={() => {}}
      />,
    )
    expect(screen.getByTestId('earmark-conjunction')).toHaveTextContent(
      'Connect a wallet to earmark this combination',
    )
  })
})
