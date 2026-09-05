import { describe, expect, it } from 'vitest'
import { CROWD_JOBS, jobsDocHref } from './jobs'

describe('jobs catalog', () => {
  it('has four jobs with in-app doc anchors', () => {
    expect(CROWD_JOBS.map((job) => job.id)).toEqual(['money', 'attention', 'work', 'wording'])
    expect(jobsDocHref()).toBe('/docs/the-jobs')
    expect(jobsDocHref(CROWD_JOBS[0])).toBe('/docs/the-jobs#money')
    expect(CROWD_JOBS.map((job) => [job.id, job.workspacePath])).toEqual([
      ['money', '/dashboard'],
      ['attention', '/dashboard'],
      ['work', '/work'],
      ['wording', '/statements'],
    ])
  })
})
