import { isValidNudgerAddress, type TrustedNudgerEntry } from '../hooks/useTrustedNudgers'

export interface CauseMediatorConfig {
  address: string
  name: string
  description: string
  serviceUrl: string
  sourceType?: string
  version?: string
}

export function mediatorNudgerFromCause(config: CauseMediatorConfig | null | undefined): TrustedNudgerEntry | null {
  if (!config || !isValidNudgerAddress(config.address) || !config.name.trim() || !config.description.trim() || !config.serviceUrl.trim()) {
    return null
  }
  return {
    address: config.address,
    name: config.name.trim(),
    description: config.description.trim(),
    serviceUrl: config.serviceUrl.replace(/\/+$/, ''),
    sourceType: config.sourceType ?? 'bridge-creator',
    version: config.version,
  }
}

export function getMediatorOptInPath(mediator: TrustedNudgerEntry): string {
  const params = new URLSearchParams({
    addNudger: mediator.address,
    nudgerName: mediator.name ?? 'Cause mediator',
    nudgerDescription: mediator.description ?? 'Suggests bridge statements for this cause.',
    nudgerSourceType: mediator.sourceType ?? 'bridge-creator',
  })
  if (mediator.serviceUrl) params.set('nudgerServiceUrl', mediator.serviceUrl)
  if (mediator.version) params.set('nudgerVersion', mediator.version)
  return `/settings?${params.toString()}`
}
