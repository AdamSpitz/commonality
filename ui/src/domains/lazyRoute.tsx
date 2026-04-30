import { lazy, Suspense, type ComponentType, type ReactElement } from 'react'

type PageModule = Record<string, ComponentType>

export function lazyRoute(loadModule: () => Promise<PageModule>, exportName: string): ReactElement {
  const Page = lazy(async () => {
    const module = await loadModule()
    return { default: module[exportName] }
  })

  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
