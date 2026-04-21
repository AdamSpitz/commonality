import { useState, useCallback } from 'react'

export const MUTED_TOPICS_KEY = 'commonality:mutedTopics'

const DEFAULT_TOPICS: string[] = []

export function loadMutedTopics(): string[] {
  try {
    const stored = localStorage.getItem(MUTED_TOPICS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'string')) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_TOPICS
}

export function saveMutedTopics(topics: string[]): void {
  localStorage.setItem(MUTED_TOPICS_KEY, JSON.stringify(topics))
}

export function useMutedTopics(): {
  mutedTopics: string[]
  addTopic: (topic: string) => void
  removeTopic: (topic: string) => void
} {
  const [mutedTopics, setMutedTopics] = useState<string[]>(loadMutedTopics)

  const addTopic = useCallback((topic: string) => {
    const normalized = topic.trim().toLowerCase()
    if (!normalized) return
    setMutedTopics((prev) => {
      if (prev.includes(normalized)) return prev
      const next = [...prev, normalized]
      saveMutedTopics(next)
      return next
    })
  }, [])

  const removeTopic = useCallback((topic: string) => {
    const normalized = topic.trim().toLowerCase()
    setMutedTopics((prev) => {
      const next = prev.filter((t) => t !== normalized)
      saveMutedTopics(next)
      return next
    })
  }, [])

  return { mutedTopics, addTopic, removeTopic }
}
