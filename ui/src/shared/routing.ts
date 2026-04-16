const routerMode = resolveRouterMode()

function resolveRouterMode(): 'hash' | 'browser' {
  if (import.meta.env.VITE_ROUTER_MODE === 'hash') {
    return 'hash'
  }

  if (import.meta.env.VITE_ROUTER_MODE === 'browser') {
    return 'browser'
  }

  return import.meta.env.MODE === 'ipfs' ? 'hash' : 'browser'
}

function normalizeAppPath(path: string): string {
  if (!path) {
    return '/'
  }

  return path.startsWith('/') ? path : `/${path}`
}

export function isHashRouting(): boolean {
  return routerMode === 'hash'
}

export function getAppUrl(path: string): string {
  const normalizedPath = normalizeAppPath(path)

  if (typeof window === 'undefined') {
    return normalizedPath
  }

  if (isHashRouting()) {
    return `${window.location.origin}${window.location.pathname}${window.location.search}#${normalizedPath}`
  }

  return `${window.location.origin}${normalizedPath}`
}
