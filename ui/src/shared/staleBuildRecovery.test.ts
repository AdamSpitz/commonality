import { describe, expect, it, vi } from 'vitest'
import { installStaleBuildRecovery, isLikelyStaleBuildError, reloadAfterStaleBuild } from './staleBuildRecovery'

describe('stale build recovery', () => {
  it('recognizes dynamic import failures caused by stale index.html', () => {
    expect(isLikelyStaleBuildError(new TypeError('Failed to fetch dynamically imported module: https://example/assets/Route-abc.js'))).toBe(true)
    expect(isLikelyStaleBuildError(new Error('ChunkLoadError: Loading chunk 42 failed.'))).toBe(true)
    expect(isLikelyStaleBuildError(new Error('ordinary application error'))).toBe(false)
  })

  it('reloads once for a stale-build chunk failure', () => {
    const location = { reload: vi.fn() }
    const values = new Map<string, string>()
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
    }

    expect(reloadAfterStaleBuild(new Error('Failed to fetch dynamically imported module'), location, storage)).toBe(true)
    expect(location.reload).toHaveBeenCalledOnce()
    expect(storage.setItem).toHaveBeenCalledWith('commonality:stale-build-reloaded', '1')

    expect(reloadAfterStaleBuild(new Error('Failed to fetch dynamically imported module'), location, storage)).toBe(false)
    expect(location.reload).toHaveBeenCalledOnce()
  })

  it('prevents Vite preload errors and reloads', () => {
    const listeners: Record<string, EventListener> = {}
    const windowLike = {
      addEventListener: vi.fn((type: string, listener: EventListener) => { listeners[type] = listener }),
    }

    installStaleBuildRecovery(windowLike)

    const event = new CustomEvent('vite:preloadError', {
      cancelable: true,
      detail: new Error('Failed to fetch dynamically imported module'),
    }) as CustomEvent<unknown> & { payload?: unknown }
    event.payload = event.detail

    listeners['vite:preloadError'](event)

    expect(event.defaultPrevented).toBe(true)
  })
})
