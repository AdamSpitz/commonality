import { useEffect, useState } from 'react'
import type { SupportingTool } from '../lib/tools'
import { loadToolExamples, type ToolExample } from '../lib/toolExamples'
import { useMachinery } from '../../shared'

const cache = new Map<string, ToolExample[]>()

export function useToolExamples(tool: SupportingTool): {
  examples: ToolExample[]
  loading: boolean
} {
  const machinery = useMachinery()
  const [examples, setExamples] = useState<ToolExample[]>(() => cache.get(tool.id) ?? [])
  const [loading, setLoading] = useState(!cache.has(tool.id))

  useEffect(() => {
    let cancelled = false
    const cached = cache.get(tool.id)
    if (cached) {
      setExamples(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    void loadToolExamples(tool, machinery)
      .then((result) => {
        if (cancelled) return
        cache.set(tool.id, result)
        setExamples(result)
      })
      .catch(() => {
        if (cancelled) return
        cache.set(tool.id, [])
        setExamples([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tool, machinery])

  return { examples, loading }
}
