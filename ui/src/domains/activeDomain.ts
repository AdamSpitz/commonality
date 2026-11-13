import type { DomainManifest } from './types'

let injected: DomainManifest | null = null

export function injectActiveDomain(manifest: DomainManifest) {
  injected = manifest
}

export function getActiveDomain(): DomainManifest {
  if (!injected) {
    throw new Error('No active domain manifest. Call injectActiveDomain before rendering.')
  }
  return injected
}
