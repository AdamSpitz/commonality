import { getRuntimeConfig, type UiRuntimeConfig } from '../config/runtimeConfig'
import { isValidNudgerAddress, type TrustedNudgerEntry } from '../hooks/useTrustedNudgers'

const LOCAL_DEFAULT_CSM_MEDIATOR_ADDRESS = '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955'

const DEFAULT_CSM_MEDIATOR_ENTRY: Omit<TrustedNudgerEntry, 'address'> = {
  name: 'Common Sense Majority mediator',
  description: 'Suggests low-commitment CSM bridge statements you might be willing to sign in Tally.',
  sourceType: 'bridge-creator',
}

function normalizeMediatorEntry(entry: TrustedNudgerEntry): TrustedNudgerEntry | null {
  if (!isValidNudgerAddress(entry.address)) {
    return null
  }

  return {
    ...DEFAULT_CSM_MEDIATOR_ENTRY,
    ...entry,
  }
}

function parseConfiguredMediator(raw: string | undefined): TrustedNudgerEntry | null {
  if (!raw?.trim()) return null

  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as TrustedNudgerEntry
      return normalizeMediatorEntry(parsed)
    } catch {
      return null
    }
  }

  return normalizeMediatorEntry({ address: trimmed })
}

export function getCsmMediatorNudger(config: UiRuntimeConfig = getRuntimeConfig()): TrustedNudgerEntry | null {
  const configured = parseConfiguredMediator(config.VITE_CSM_MEDIATOR_NUDGER)
  if (configured) return configured

  if (config.COMMONALITY_ENVIRONMENT && config.COMMONALITY_ENVIRONMENT !== 'local') {
    return null
  }

  return normalizeMediatorEntry({ address: LOCAL_DEFAULT_CSM_MEDIATOR_ADDRESS })
}

export function getTallyMediatorOptInPath(mediator: TrustedNudgerEntry): string {
  const params = new URLSearchParams({
    addNudger: mediator.address,
    nudgerName: mediator.name ?? DEFAULT_CSM_MEDIATOR_ENTRY.name!,
    nudgerDescription: mediator.description ?? DEFAULT_CSM_MEDIATOR_ENTRY.description!,
    nudgerSourceType: mediator.sourceType ?? DEFAULT_CSM_MEDIATOR_ENTRY.sourceType!,
  })

  if (mediator.serviceUrl) {
    params.set('nudgerServiceUrl', mediator.serviceUrl)
  }

  if (mediator.version) {
    params.set('nudgerVersion', mediator.version)
  }

  return `/settings?${params.toString()}`
}
