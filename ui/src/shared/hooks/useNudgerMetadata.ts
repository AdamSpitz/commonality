import { useState, useEffect } from 'react'

export interface NudgerMetadata {
  address: string
  name: string
  description: string
  sourceType: string
  version: string
}

async function fetchNudgerMetadata(serviceUrl: string): Promise<NudgerMetadata | null> {
  try {
    const url = `${serviceUrl.replace(/\/+$/, '')}/.well-known/nudger.json`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return {
      address: data.address ?? '',
      name: data.name ?? 'Unknown Nudger',
      description: data.description ?? '',
      sourceType: data.sourceType ?? 'unknown',
      version: data.version ?? '0.0.0',
    }
  } catch {
    return null
  }
}

export function useNudgerMetadata(serviceUrl: string | null): NudgerMetadata | null {
  const [metadata, setMetadata] = useState<NudgerMetadata | null>(null)

  useEffect(() => {
    if (!serviceUrl) {
      setMetadata(null)
      return
    }

    let cancelled = false
    void fetchNudgerMetadata(serviceUrl).then((result) => {
      if (!cancelled) setMetadata(result)
    })

    return () => {
      cancelled = true
    }
  }, [serviceUrl])

  return metadata
}
