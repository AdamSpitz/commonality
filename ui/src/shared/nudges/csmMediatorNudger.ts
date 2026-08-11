import { getRuntimeConfig, type UiRuntimeConfig } from '../config/runtimeConfig'
import { isValidNudgerAddress, type TrustedNudgerEntry } from '../hooks/useTrustedNudgers'
import { getMediatorOptInPath, mediatorNudgerFromCause, type CauseMediatorConfig } from './mediatorNudger'

const LOCAL_DEFAULT_CSM_MEDIATOR_ADDRESS = '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955'

const DEFAULT_CSM_MEDIATOR_ENTRY: Omit<TrustedNudgerEntry, 'address'> = {
  name: 'Common Sense Majority mediator',
  description: 'Suggests low-commitment CSM bridge statements you might be willing to sign in Tally.',
  sourceType: 'bridge-creator',
}

function normalizeMediatorEntry(entry: TrustedNudgerEntry): TrustedNudgerEntry | null {
  const merged = { ...DEFAULT_CSM_MEDIATOR_ENTRY, ...entry }
  if (!isValidNudgerAddress(merged.address)) return null
  if (!merged.serviceUrl) return merged
  return mediatorNudgerFromCause({
    address: merged.address,
    name: merged.name!,
    description: merged.description!,
    serviceUrl: merged.serviceUrl,
    sourceType: merged.sourceType,
    version: merged.version,
  })
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

export function getCsmMediatorNudger(
  config: UiRuntimeConfig = getRuntimeConfig(),
  causeMediator?: CauseMediatorConfig,
): TrustedNudgerEntry | null {
  if (causeMediator) return mediatorNudgerFromCause(causeMediator)
  const configured = parseConfiguredMediator(config.VITE_CSM_MEDIATOR_NUDGER)
  if (configured) return configured

  if (config.COMMONALITY_ENVIRONMENT && config.COMMONALITY_ENVIRONMENT !== 'local') {
    return null
  }

  return normalizeMediatorEntry({ address: LOCAL_DEFAULT_CSM_MEDIATOR_ADDRESS })
}

export const getTallyMediatorOptInPath = getMediatorOptInPath
