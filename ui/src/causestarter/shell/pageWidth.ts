/**
 * CauseStarter is one SPA. Viewport only changes how wide the shell is, not
 * which pages or handlers exist. Phone stays `sm`. Desktop uses `md` for
 * reading (docs, settings) and `lg` for workspaces (cause boards, home).
 */
export type PageWidth = 'reading' | 'workspace'

export function pageWidthForPath(pathname: string): PageWidth {
  if (pathname === '/docs' || pathname.startsWith('/docs/')) return 'reading'
  if (pathname === '/settings') return 'reading'
  return 'workspace'
}

export function containerMaxWidth(
  width: PageWidth,
  isDesktop: boolean,
): 'sm' | 'md' | 'lg' {
  if (!isDesktop) return 'sm'
  return width === 'reading' ? 'md' : 'lg'
}
