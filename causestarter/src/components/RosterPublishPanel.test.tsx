import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CoherenceVerdict } from '../lib/causeAssistClient'
import { RosterPublishPanel, type RosterPublishPanelProps } from './RosterPublishPanel'

const previewCid = 'bafkreimisleadingroster'

afterEach(cleanup)

function renderPanel(overrides: Partial<RosterPublishPanelProps> = {}) {
  const handlers = {
    onTitleChange: vi.fn(),
    onSummaryChange: vi.fn(),
    onSlugChange: vi.fn(),
    onCheckCoherence: vi.fn(),
    onPublish: vi.fn(),
    onPublishAnyway: vi.fn(),
  }
  render(
    <RosterPublishPanel
      title="Safer neighborhood walks"
      summary="Neighbors are improving lighting and crossings for pedestrians."
      slug="safer-walks"
      previewCid={previewCid}
      coherence={null}
      slugLocked={false}
      canPublish
      checking={false}
      publishing={false}
      disabled={false}
      walletReady
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

function verdict(overrides: Partial<CoherenceVerdict> = {}): CoherenceVerdict {
  return {
    coherent: false,
    reasoning: 'The bus-route rider is not disclosed by the narrative.',
    attesterId: 'cause-assist-coherence-v1',
    rosterCid: previewCid,
    source: 'llm',
    ...overrides,
  }
}

describe('RosterPublishPanel coherence boundary', () => {
  it('withholds the badge path for a misleading narrative while preserving unbadged publication', () => {
    const handlers = renderPanel({ coherence: verdict() })

    expect(screen.getByTestId('roster-coherence-verdict')).toHaveTextContent(/No coherence badge/i)
    expect(screen.getByTestId('roster-coherence-verdict')).toHaveTextContent(/rider is not disclosed/i)
    expect(screen.getByTestId('roster-publish')).toBeDisabled()
    expect(screen.getByTestId('roster-publish-anyway')).toBeEnabled()

    fireEvent.click(screen.getByTestId('roster-publish-anyway'))
    expect(handlers.onPublishAnyway).toHaveBeenCalledOnce()
    expect(handlers.onPublish).not.toHaveBeenCalled()
  })

  it('enables badged publication for a matching positive construction verdict', () => {
    const handlers = renderPanel({
      coherence: verdict({
        coherent: true,
        reasoning: 'The narrative plainly discloses every listed issue.',
      }),
    })

    expect(screen.getByTestId('roster-publish')).toBeEnabled()
    expect(screen.getByText('Badge ready')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('roster-publish'))
    expect(handlers.onPublish).toHaveBeenCalledOnce()
  })

  it('does not reuse a positive verdict after the roster CID changes', () => {
    renderPanel({
      previewCid: 'bafkreieditedroster',
      coherence: verdict({ coherent: true, reasoning: 'The original roster matched.' }),
    })

    expect(screen.getByText(/page changed since the last check/i)).toBeInTheDocument()
    expect(screen.queryByText('Badge ready')).not.toBeInTheDocument()
    expect(screen.getByTestId('roster-publish')).toBeDisabled()
    expect(screen.getByTestId('roster-publish-anyway')).toBeEnabled()
  })
})
