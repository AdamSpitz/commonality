import { useState, useCallback } from 'react'

export type NudgeIntensity = 'low' | 'medium' | 'high'

export const NUDGE_INTENSITY_KEY = 'commonality:nudgeIntensity'

const DEFAULT_INTENSITY: NudgeIntensity = 'low'

export function loadNudgeIntensity(): NudgeIntensity {
  try {
    const stored = localStorage.getItem(NUDGE_INTENSITY_KEY)
    if (stored === 'low' || stored === 'medium' || stored === 'high') {
      return stored
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_INTENSITY
}

export function saveNudgeIntensity(intensity: NudgeIntensity): void {
  localStorage.setItem(NUDGE_INTENSITY_KEY, intensity)
}

export function useNudgeIntensity(): {
  intensity: NudgeIntensity
  setIntensity: (intensity: NudgeIntensity) => void
} {
  const [intensity, setIntensity] = useState<NudgeIntensity>(loadNudgeIntensity)

  const updateIntensity = useCallback((newIntensity: NudgeIntensity) => {
    setIntensity(newIntensity)
    saveNudgeIntensity(newIntensity)
  }, [])

  return { intensity, setIntensity: updateIntensity }
}
