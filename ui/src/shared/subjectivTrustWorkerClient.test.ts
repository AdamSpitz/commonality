import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const computeSubjectivTrustedSetResult = vi.fn()

vi.mock('./subjectivTrustComputation', () => ({
  computeSubjectivTrustedSetResult,
}))

class FakeWorker {
  static lastInstance: FakeWorker | null = null
  static instances: FakeWorker[] = []

  postedMessages: unknown[] = []
  terminated = false
  private listeners = new Map<string, Array<(event: MessageEvent<any>) => void>>()

  constructor(_url: URL, _options: WorkerOptions) {
    FakeWorker.lastInstance = this
    FakeWorker.instances.push(this)
  }

  addEventListener(type: string, listener: (event: MessageEvent<any>) => void) {
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
      listener({ data } as MessageEvent<any>)
    }
  }
}

const contractAddresses = {
  beliefs: '0x1111111111111111111111111111111111111111',
  implications: '0x2222222222222222222222222222222222222222',
  assuranceContractFactory: '0x3333333333333333333333333333333333333333',
  erc1155Factory: '0x4444444444444444444444444444444444444444',
  marketplaceFactory: '0x5555555555555555555555555555555555555555',
  delegatableNotes: '0x6666666666666666666666666666666666666666',
  noteIntent: '0x7777777777777777777777777777777777777777',
  alignmentAttestations: '0x8888888888888888888888888888888888888888',
  mutableRefUpdater: '0x9999999999999999999999999999999999999999',
  trustRegistry: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
} as const

describe('computeSubjectivTrustedSet', () => {
  const originalWorker = globalThis.Worker

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    FakeWorker.lastInstance = null
    FakeWorker.instances = []
    globalThis.Worker = FakeWorker as any
  })

  it('forwards worker progress updates before resolving the final result', async () => {
    const progressUpdates: Array<{ hasDirectTrust: boolean; trustedSet: string[] }> = []
    const { computeSubjectivTrustedSet } = await import('./subjectivTrustWorkerClient')

    const resultPromise = computeSubjectivTrustedSet({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
      onProgress: update => {
        progressUpdates.push(update)
      },
    })

    const worker = FakeWorker.lastInstance
    expect(worker).not.toBeNull()

    const [request] = worker!.postedMessages as Array<{ requestId: number }>

    worker!.dispatch('message', {
      type: 'trustedSetProgress',
      requestId: request.requestId,
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
    })

    worker!.dispatch('message', {
      type: 'trustedSetResult',
      requestId: request.requestId,
      hasDirectTrust: true,
      trustedSet: [
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        '0xcccccccccccccccccccccccccccccccccccccccc',
      ],
      directTrustMappings: {
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [
          { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
        ],
      },
    })

    await expect(resultPromise).resolves.toEqual({
      hasDirectTrust: true,
      trustedSet: [
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        '0xcccccccccccccccccccccccccccccccccccccccc',
      ],
      directTrustMappings: {
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [
          { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
        ],
      },
    })

    expect(progressUpdates).toEqual([
      {
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      },
    ])
    expect(computeSubjectivTrustedSetResult).not.toHaveBeenCalled()
  })

  it('forwards maxHops to the worker request', async () => {
    const { computeSubjectivTrustedSet } = await import('./subjectivTrustWorkerClient')

    const resultPromise = computeSubjectivTrustedSet({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
      maxHops: 1,
    })

    const worker = FakeWorker.lastInstance
    expect(worker).not.toBeNull()

    const [request] = worker!.postedMessages as Array<{ requestId: number; maxHops?: number }>
    expect(request.maxHops).toBe(1)

    worker!.dispatch('message', {
      type: 'trustedSetResult',
      requestId: request.requestId,
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
    })

    await expect(resultPromise).resolves.toEqual({
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
    })
    expect(computeSubjectivTrustedSetResult).not.toHaveBeenCalled()
  })

  it('falls back to the main-thread implementation when Worker is unavailable', async () => {
    globalThis.Worker = undefined as any
    computeSubjectivTrustedSetResult.mockImplementation(async ({ onProgress }) => {
      onProgress?.({
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      })

      return {
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
        directTrustMappings: {
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [
            { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
          ],
        },
      }
    })

    const progressUpdates: Array<{ hasDirectTrust: boolean; trustedSet: string[] }> = []
    const { computeSubjectivTrustedSet } = await import('./subjectivTrustWorkerClient')

    await expect(
      computeSubjectivTrustedSet({
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        eventCacheUrl: 'http://localhost:42069/api',
        contractAddresses,
        maxHops: 2,
        onProgress: update => {
          progressUpdates.push(update)
        },
      })
    ).resolves.toEqual({
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      directTrustMappings: {
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [
          { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
        ],
      },
    })

    expect(progressUpdates).toEqual([
      {
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      },
    ])
    expect(FakeWorker.instances).toHaveLength(0)
    expect(computeSubjectivTrustedSetResult).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        eventCacheUrl: 'http://localhost:42069/api',
        maxHops: 2,
      })
    )
  })

  it('rejects crashed worker requests and recreates the worker for the next request', async () => {
    const { computeSubjectivTrustedSet } = await import('./subjectivTrustWorkerClient')

    const firstResultPromise = computeSubjectivTrustedSet({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
    })

    const firstWorker = FakeWorker.lastInstance
    expect(firstWorker).not.toBeNull()

    firstWorker!.dispatch('error', undefined)

    await expect(firstResultPromise).rejects.toThrow('Subjectiv trust worker crashed')
    expect(firstWorker!.terminated).toBe(true)

    const secondResultPromise = computeSubjectivTrustedSet({
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
    })

    const secondWorker = FakeWorker.lastInstance
    expect(secondWorker).not.toBeNull()
    expect(secondWorker).not.toBe(firstWorker)
    expect(FakeWorker.instances).toHaveLength(2)

    const [request] = secondWorker!.postedMessages as Array<{ requestId: number }>

    secondWorker!.dispatch('message', {
      type: 'trustedSetResult',
      requestId: request.requestId,
      hasDirectTrust: true,
      trustedSet: ['0xcccccccccccccccccccccccccccccccccccccccc'],
      directTrustMappings: {
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': [
          { trustee: '0xcccccccccccccccccccccccccccccccccccccccc', score: 80 },
        ],
      },
    })

    await expect(secondResultPromise).resolves.toEqual({
      hasDirectTrust: true,
      trustedSet: ['0xcccccccccccccccccccccccccccccccccccccccc'],
      directTrustMappings: {
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': [
          { trustee: '0xcccccccccccccccccccccccccccccccccccccccc', score: 80 },
        ],
      },
    })
    expect(computeSubjectivTrustedSetResult).not.toHaveBeenCalled()
  })

  afterEach(() => {
    globalThis.Worker = originalWorker
  })
})
