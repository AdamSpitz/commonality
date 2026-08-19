import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BridgeClusterAssist } from './BridgeClusterAssist'
import { createBridge, forgetUnsavedBridges } from '../lib/bridgeStore'
import { BRIDGE_CLUSTER_PATCH_SCHEMA } from '../lib/bridgeAssistBrief'

vi.mock('../lib/causeAssistClient', () => ({
  draftModifiedPlank: vi.fn(),
  draftBridgePlank: vi.fn(),
  critiqueTriple: vi.fn(),
}))

describe('BridgeClusterAssist', () => {
  afterEach(() => {
    forgetUnsavedBridges()
    window.localStorage.clear()
  })

  it('applies a pasted patch without calling cause-assist', async () => {
    const draft = createBridge()
    const onDraft = vi.fn()
    render(
      <BridgeClusterAssist
        draft={draft}
        onDraft={onDraft}
        busy={false}
        setBusy={vi.fn()}
      />,
    )
    const json = JSON.stringify({
      schema: BRIDGE_CLUSTER_PATCH_SCHEMA,
      bridge: { planks: ['Shared housing is too expensive for ordinary families.'] },
    })
    const field = screen.getByTestId('bridge-patch-paste').querySelector('textarea') as HTMLTextAreaElement
    await userEvent.click(field)
    await userEvent.paste(json)
    await userEvent.click(screen.getByTestId('bridge-apply-patch'))
    expect(onDraft).toHaveBeenCalled()
    const patch = onDraft.mock.calls[0]?.[0] as { bridge?: { planks: Array<{ text: string }> } }
    expect(patch.bridge?.planks[0]?.text).toMatch(/too expensive/)
  })
})
