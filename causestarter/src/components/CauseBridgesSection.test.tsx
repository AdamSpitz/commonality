import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CauseBridgesSection } from './CauseBridgesSection'
import type { CauseDraft } from '../lib/causeStore'
import type { BridgeDraft } from '../lib/bridgeStore'

const listBridges = vi.fn<() => BridgeDraft[]>(() => [])

vi.mock('../lib/bridgeStore', () => ({
  listBridges: () => listBridges(),
}))

vi.mock('@ui/shared', () => ({
  InfoChip: ({ label }: { label: string }) => <span>{label}</span>,
}))

afterEach(() => {
  cleanup()
  listBridges.mockReset()
  listBridges.mockImplementation(() => [])
})

function cause(overrides: Partial<CauseDraft> = {}): CauseDraft {
  return {
    id: 'local-1',
    planks: [],
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
    founderAddress: '0x1111111111111111111111111111111111111111',
    slug: 'faithful-neighbors',
    ...overrides,
  } as CauseDraft
}

function bridgeDraft(overrides: Partial<BridgeDraft> = {}): BridgeDraft {
  return {
    id: 'bridge-1',
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
    mediatorName: 'Neighbors and Localists',
    mediatorNote: '',
    parents: [],
    bridge: { title: '', summary: '', slug: '', planks: [] },
    pairs: [],
    ...overrides,
  } as BridgeDraft
}

function parentSlot(owner: string, slug: string) {
  return {
    id: 'parent-1',
    kind: 'published' as const,
    owner,
    slug,
    title: '',
    summary: '',
    parentPlanks: [],
    skipModified: false,
    modified: { title: '', summary: '', slug: '', planks: [] },
  }
}

function renderSection(draft: CauseDraft, variant?: 'organizer' | 'visitor') {
  render(
    <MemoryRouter>
      <CauseBridgesSection cause={draft} variant={variant} />
    </MemoryRouter>,
  )
}

function publishedCluster() {
  return bridgeDraft({
    founderAddress: '0x1111111111111111111111111111111111111111',
    slug: 'neighbors-localists',
    clusterCid: 'bafycluster',
    parents: [parentSlot('0x1111111111111111111111111111111111111111', 'faithful-neighbors')],
  })
}

describe('CauseBridgesSection', () => {
  it('offers bridge creation and keeps the standalone mediator quieter', () => {
    renderSection(cause())

    expect(screen.getByTestId('cause-bridges-empty')).toBeInTheDocument()
    expect(screen.getByTestId('cause-create-bridge')).toHaveAttribute(
      'href',
      '/bridge/new?parentOwner=0x1111111111111111111111111111111111111111&parentSlug=faithful-neighbors',
    )
    // Advanced path: a link, not a button, and not an inline form.
    const advanced = screen.getByTestId('cause-attach-mediator')
    expect(advanced.tagName).toBe('A')
    expect(advanced).toHaveAttribute(
      'href',
      '/cause/0x1111111111111111111111111111111111111111/faithful-neighbors/mediator',
    )
    expect(screen.queryByTestId('cause-mediator-editor')).toBeNull()
  })

  it('lists a cluster that names this cause as a parent, as a link rather than its contents', () => {
    listBridges.mockImplementation(() => [bridgeDraft({
      parents: [parentSlot('0x1111111111111111111111111111111111111111', 'faithful-neighbors')],
    })])

    renderSection(cause())

    const row = screen.getByTestId('cause-bridge-row')
    expect(row).toHaveAttribute('href', '/bridge/bridge-1')
    expect(row).toHaveTextContent('Neighbors and Localists')
    expect(row).toHaveTextContent('Draft')
  })

  it('links a published cluster by its stable path and drops the draft chip', () => {
    listBridges.mockImplementation(() => [bridgeDraft({
      founderAddress: '0x1111111111111111111111111111111111111111',
      slug: 'neighbors-localists',
      clusterCid: 'bafycluster',
      parents: [parentSlot('0x1111111111111111111111111111111111111111', 'faithful-neighbors')],
    })])

    renderSection(cause())

    expect(screen.getByTestId('cause-bridge-row')).toHaveAttribute(
      'href',
      '/bridge/0x1111111111111111111111111111111111111111/neighbors-localists',
    )
    expect(screen.getByTestId('cause-bridge-row')).not.toHaveTextContent('Draft')
  })

  it('ignores clusters that name a different cause', () => {
    listBridges.mockImplementation(() => [bridgeDraft({
      parents: [parentSlot('0x2222222222222222222222222222222222222222', 'liberty-localism')],
    })])

    renderSection(cause())

    expect(screen.queryByTestId('cause-bridge-row')).toBeNull()
    expect(screen.getByTestId('cause-bridges-empty')).toBeInTheDocument()
  })

  it('shows an attached mediator as a compact row, not its featured bridges', () => {
    renderSection(cause({
      mediator: {
        name: 'Neighbors mediator',
        description: 'Watches both causes and proposes wording.',
        address: '0x3333333333333333333333333333333333333333',
        serviceUrl: 'https://mediator.example',
      },
    }))

    const row = screen.getByTestId('cause-mediator-row')
    expect(row).toHaveTextContent('Neighbors mediator')
    expect(row).toHaveAttribute(
      'href',
      '/cause/0x1111111111111111111111111111111111111111/faithful-neighbors/mediator',
    )
    expect(screen.queryByTestId('cause-bridges-empty')).toBeNull()
  })

  describe('visitor variant', () => {
    it('lists published clusters as links, without the organizer-only affordances', () => {
      listBridges.mockImplementation(() => [publishedCluster()])

      renderSection(cause(), 'visitor')

      expect(screen.getByTestId('cause-bridge-row')).toHaveAttribute(
        'href',
        '/bridge/0x1111111111111111111111111111111111111111/neighbors-localists',
      )
      expect(screen.queryByTestId('cause-attach-mediator')).toBeNull()
      expect(screen.queryByTestId('cause-mediator-row')).toBeNull()
    })

    it('hides clusters that exist only on the organizer\u2019s device', () => {
      listBridges.mockImplementation(() => [bridgeDraft({
        parents: [parentSlot('0x1111111111111111111111111111111111111111', 'faithful-neighbors')],
      })])

      renderSection(cause(), 'visitor')

      expect(screen.queryByTestId('cause-bridge-row')).toBeNull()
      expect(screen.getByTestId('cause-bridges-empty')).toBeInTheDocument()
    })

    it('still shows the section, an empty note and a create button with no bridges', () => {
      renderSection(cause({
        mediator: {
          name: 'Neighbors mediator',
          description: 'Watches both causes.',
          address: '0x3333333333333333333333333333333333333333',
          serviceUrl: 'https://mediator.example',
        },
      }), 'visitor')

      expect(screen.getByTestId('cause-bridges-section')).toBeInTheDocument()
      expect(screen.getByTestId('cause-bridges-empty')).toBeInTheDocument()
      expect(screen.getByTestId('cause-create-bridge')).toBeInTheDocument()
      expect(screen.getByTestId('cause-create-bridge-note')).toBeInTheDocument()
    })

    it('prefills the cause as natural parent 1, and falls back for an unpublished draft', () => {
      renderSection(cause({ title: 'Faithful Neighbors' }), 'visitor')
      expect(screen.getByTestId('cause-create-bridge')).toHaveAttribute(
        'href',
        '/bridge/new?parentOwner=0x1111111111111111111111111111111111111111'
        + '&parentSlug=faithful-neighbors&parentTitle=Faithful+Neighbors',
      )

      cleanup()
      renderSection(cause({ founderAddress: undefined, slug: undefined }), 'visitor')
      expect(screen.getByTestId('cause-create-bridge')).toHaveAttribute('href', '/bridge/new')
    })
  })
})
