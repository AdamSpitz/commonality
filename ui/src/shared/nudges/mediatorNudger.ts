import { isValidNudgerAddress, type TrustedNudgerEntry } from '../hooks/useTrustedNudgers'

export interface CauseMediatorConfig {
  address: string
  name: string
  description: string
  serviceUrl?: string
  sourceType?: string
  version?: string
}

/**
 * Listener object for a mediator address. `serviceUrl` is optional: a human
 * cluster publisher has an address but no HTTP service ([ADR 0012](/specs/decisions/0012-mediator-is-an-address.md)).
 */
export function mediatorNudgerFromCause(config: CauseMediatorConfig | null | undefined): TrustedNudgerEntry | null {
  if (!config || !isValidNudgerAddress(config.address) || !config.name.trim()) {
    return null
  }
  const serviceUrl = config.serviceUrl?.trim().replace(/\/+$/, '') || undefined
  const entry: TrustedNudgerEntry = {
    address: config.address,
    name: config.name.trim(),
  }
  const description = config.description.trim()
  if (description) entry.description = description
  if (serviceUrl) {
    entry.serviceUrl = serviceUrl
    entry.sourceType = config.sourceType ?? 'bridge-creator'
  } else if (config.sourceType) {
    entry.sourceType = config.sourceType
  }
  if (config.version) entry.version = config.version
  return entry
}

/** Attached synthesizer: featured triples need a live `serviceUrl`. */
export function serviceMediatorFromCause(config: CauseMediatorConfig | null | undefined): TrustedNudgerEntry | null {
  const entry = mediatorNudgerFromCause(config)
  if (!entry?.serviceUrl) return null
  return entry
}

export function getMediatorOptInPath(mediator: TrustedNudgerEntry): string {
  const params = new URLSearchParams({
    addNudger: mediator.address,
    nudgerName: mediator.name ?? 'Cause mediator',
    nudgerDescription: mediator.description ?? 'Suggests bridge statements for this cause.',
  })
  if (mediator.sourceType) params.set('nudgerSourceType', mediator.sourceType)
  if (mediator.serviceUrl) params.set('nudgerServiceUrl', mediator.serviceUrl)
  if (mediator.version) params.set('nudgerVersion', mediator.version)
  return `/settings?${params.toString()}`
}
