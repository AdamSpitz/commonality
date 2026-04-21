import { describe, it, expect, beforeEach } from 'vitest'
import { loadNudgeIntensity, saveNudgeIntensity } from './useNudgeIntensity'

describe('useNudgeIntensity', () => {
  const KEY = 'commonality:nudgeIntensity'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadNudgeIntensity', () => {
    it('returns "low" by default', () => {
      expect(loadNudgeIntensity()).toBe('low')
    })

    it('returns stored value when valid', () => {
      localStorage.setItem(KEY, 'high')
      expect(loadNudgeIntensity()).toBe('high')
    })

    it('returns default for invalid stored value', () => {
      localStorage.setItem(KEY, 'invalid')
      expect(loadNudgeIntensity()).toBe('low')
    })
  })

  describe('saveNudgeIntensity', () => {
    it('persists the intensity', () => {
      saveNudgeIntensity('medium')
      expect(localStorage.getItem(KEY)).toBe('medium')
    })

    it('overwrites previous value', () => {
      saveNudgeIntensity('low')
      saveNudgeIntensity('high')
      expect(localStorage.getItem(KEY)).toBe('high')
    })
  })
})
