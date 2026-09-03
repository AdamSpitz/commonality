import { describe, expect, it } from 'vitest'
import { containerMaxWidth, pageWidthForPath } from './pageWidth'

describe('pageWidthForPath', () => {
  it('keeps docs and settings at reading width', () => {
    expect(pageWidthForPath('/docs')).toBe('reading')
    expect(pageWidthForPath('/docs/causestarter/the-jobs')).toBe('reading')
    expect(pageWidthForPath('/settings')).toBe('reading')
  })

  it('treats cause boards and home as workspaces', () => {
    expect(pageWidthForPath('/')).toBe('workspace')
    expect(pageWidthForPath('/causes')).toBe('workspace')
    expect(pageWidthForPath('/cause/abc')).toBe('workspace')
    expect(pageWidthForPath('/funding/abc')).toBe('workspace')
  })
})

describe('containerMaxWidth', () => {
  it('stays phone-narrow below md', () => {
    expect(containerMaxWidth('workspace', false)).toBe('sm')
    expect(containerMaxWidth('reading', false)).toBe('sm')
  })

  it('widens workspaces further than reading pages on desktop', () => {
    expect(containerMaxWidth('reading', true)).toBe('md')
    expect(containerMaxWidth('workspace', true)).toBe('lg')
  })
})
