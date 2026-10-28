import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWorker {
  static lastInstance: FakeWorker | null = null
  postedMessages: unknown[] = []
  terminated = false
  private listeners = new Map<string, Array<(event: MessageEvent<unknown>) => void>>()

  constructor(_url: URL, _options: WorkerOptions) {
    FakeWorker.lastInstance = this
  }

  addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  postMessage(message: unknown) {
    this.postedMessages.push(message)
  }

  terminate() {
    this.terminated = true
  }

  dispatch(type: string, data: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data } as MessageEvent<unknown>)
    }
  }
}

describe('createOffThreadGlobalFold', () => {
  const originalWorker = globalThis.Worker

  beforeEach(() => {
    vi.resetModules()
    FakeWorker.lastInstance = null
    globalThis.Worker = FakeWorker as unknown as typeof Worker
  })

  afterEach(() => {
    globalThis.Worker = originalWorker
  })

  it('posts the fold to the worker and resolves its result', async () => {
    const { createOffThreadGlobalFold } = await import('./globalFoldWorkerClient')
    const run = createOffThreadGlobalFold({ eventCacheUrl: 'http://localhost:42069' })
    const pending = run!('getAllProjects', [])
    const worker = FakeWorker.lastInstance
    expect(worker).not.toBeNull()
    const request = worker!.postedMessages[0] as { requestId: number; name: string }
    expect(request.name).toBe('getAllProjects')
    worker!.dispatch('message', { type: 'foldResult', requestId: request.requestId, result: [{ address: '0x1' }] })
    await expect(pending).resolves.toEqual([{ address: '0x1' }])
  })

  it('stays unset when Worker is unavailable', async () => {
    globalThis.Worker = undefined as unknown as typeof Worker
    const { createOffThreadGlobalFold } = await import('./globalFoldWorkerClient')
    expect(createOffThreadGlobalFold({ eventCacheUrl: 'http://localhost:42069' })).toBeUndefined()
  })
})
