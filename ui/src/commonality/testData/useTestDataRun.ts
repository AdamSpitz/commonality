import { useEffect, useState } from 'react'
import { fetchEncryptedTestData, resolveRunUrl, testDataEnvironment, testDataRegistryUrl, type TestDataRegistry, type TestDataRun } from './testDataDocuments'

export function useTestDataRun(runId: string | undefined, capability: string) {
  const [run, setRun] = useState<TestDataRun | null>(null)
  const [error, setError] = useState<string | null>(null)
  const registryUrl = testDataRegistryUrl()
  const environment = testDataEnvironment()
  useEffect(() => {
    setRun(null)
    setError(null)
    if (!registryUrl || !capability || !runId || environment === 'disabled') return
    let cancelled = false
    void fetchEncryptedTestData<TestDataRegistry>(registryUrl, capability).then(registry => {
      const entry = registry.runs.find(candidate => candidate.runId === runId)
      if (!entry) throw new Error('That run is not present in the current registry.')
      return fetchEncryptedTestData<TestDataRun>(resolveRunUrl(registryUrl, entry.href), capability)
    }).then(value => { if (!cancelled) setRun(value) })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { cancelled = true }
  }, [capability, environment, registryUrl, runId])
  return { run, error, environment, registryUrl }
}
