import { PolicyBundleRuntime, type PolicyRuntimeSnapshot } from '@commonality/sdk/policy-lists'
import { getRuntimeConfig, getRuntimeConfigValue } from './runtimeConfig'

const runtime = new PolicyBundleRuntime()
let initialLoad: Promise<PolicyRuntimeSnapshot> | null = null

function isCivilityDomain(domain = import.meta.env.VITE_DOMAIN): boolean {
  return domain === 'civility'
}

/** Load the activated policy bundle for the Civility reference vertical. */
export function loadActivePolicyBundle(domain?: string): Promise<PolicyRuntimeSnapshot> {
  if (!isCivilityDomain(domain)) return Promise.resolve(runtime.snapshot())
  if (!initialLoad) {
    const url = getRuntimeConfigValue('VITE_POLICY_BUNDLE_URL')
    initialLoad = (url ? runtime.refresh(url, fetch) : Promise.resolve(runtime.snapshot())).then((snapshot) => {
      const environment = getRuntimeConfig().COMMONALITY_ENVIRONMENT ?? 'local'
      if (environment !== 'local' && !snapshot.evaluator) {
        throw new Error(
          `Civility requires an active policy bundle in ${environment}. Configure VITE_POLICY_BUNDLE_URL with a valid resolved bundle.`,
        )
      }
      return snapshot
    })
  }
  return initialLoad!
}

/** Re-fetch without dropping the currently enforced evaluator while in flight. */
export function refreshActivePolicyBundle(domain?: string): Promise<PolicyRuntimeSnapshot> {
  const url = getRuntimeConfigValue('VITE_POLICY_BUNDLE_URL')
  if (!isCivilityDomain(domain) || !url) return Promise.resolve(runtime.snapshot())
  initialLoad = runtime.refresh(url, fetch)
  return initialLoad!
}

export function getActivePolicyBundle(): PolicyRuntimeSnapshot {
  return runtime.snapshot()
}
