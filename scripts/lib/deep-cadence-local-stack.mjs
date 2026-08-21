/**
 * Local deep-cadence checks that mutate or depend on exclusive use of the
 * Docker stack. Cadence must run them one at a time and skip the rest of this
 * set once any of them fail, so stack.restart-consistency cannot start while
 * stack.fresh-seeded is still wiping, or against a half-destroyed stack.
 */
export const LOCAL_STACK_CADENCE_CHECK_IDS = [
  'stack.fresh-seeded',
  'operations.local-stack-health',
  'stack.restart-consistency',
  'operations.indexer-lag',
  'artifact.ipfs-domain-smoke',
  'stack.user-journeys',
]

export function isFailedCadenceResult(result) {
  return Boolean(
    result?.signal
    || result?.status === 'fail'
    || result?.status === 'error'
    || (result?.code !== 0 && result?.status !== 'uncertain' && result?.status !== 'skipped'),
  )
}

export function shouldSkipLocalStackCadenceCheck(checkId, localStackAlreadyFailed) {
  return Boolean(localStackAlreadyFailed && LOCAL_STACK_CADENCE_CHECK_IDS.includes(checkId))
}
