const STALE_BUILD_RELOAD_KEY = 'commonality:stale-build-reloaded'

type VitePreloadErrorEvent = Event & { payload?: unknown }

export function isLikelyStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError|CSS_CHUNK_LOAD_FAILED/i.test(message)
}

export function reloadAfterStaleBuild(error: unknown, location: Pick<Location, 'reload'> = window.location, sessionStorageLike: Pick<Storage, 'getItem' | 'setItem'> = window.sessionStorage): boolean {
  if (!isLikelyStaleBuildError(error)) return false
  if (sessionStorageLike.getItem(STALE_BUILD_RELOAD_KEY) === '1') return false

  sessionStorageLike.setItem(STALE_BUILD_RELOAD_KEY, '1')
  location.reload()
  return true
}

export function installStaleBuildRecovery(windowLike: Pick<Window, 'addEventListener'> = window): void {
  windowLike.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadAfterStaleBuild((event as VitePreloadErrorEvent).payload)
  })

  windowLike.addEventListener('unhandledrejection', (event) => {
    reloadAfterStaleBuild(event.reason)
  })
}
