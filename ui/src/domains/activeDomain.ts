import { activeManifest } from '@ui-active-domain'
import type { DomainManifest } from './types'

export function getActiveDomain(): DomainManifest {
  return activeManifest
}
