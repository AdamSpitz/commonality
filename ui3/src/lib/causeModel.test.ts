import { beforeEach, describe, expect, it } from 'vitest'
import {
  addBelief,
  addFounder,
  addMilestone,
  addMeasureToMilestone,
  addProjectLink,
  addProjectSupporter,
  addProjectVolunteer,
  claimFounder,
  commitBeliefEdit,
  commitGoalEdit,
  createAggregate,
  createCause,
  deleteCause,
  draftStatements,
  exportCauseJson,
  exportCausesBundleJson,
  getCause,
  importCauseFromJson,
  importCausesFromJson,
  listAggregates,
  listCauses,
  markBeliefPublished,
  markGoalPublished,
  primaryGoal,
  publishedGoalSupportTargets,
  removeBelief,
  removeMilestone,
  removeProjectLink,
  restoreGoalVersion,
  rootBeliefs,
  supportingBeliefs,
  updateMilestone,
  updateProjectStatus,
  CAUSE_EXPORT_FORMAT,
  CAUSE_BUNDLE_FORMAT,
  causePortableShareUrl,
  decodePortableSharePayload,
} from './causeModel'

describe('causeModel (single goal + timeline + projects)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates a cause with goal, founders, beliefs, milestones, projects', () => {
    const cause = createCause({ title: 'Clean rivers', summary: 'Local waters' })
    expect(cause.goal.role).toBe('goal')
    expect(cause.founders).toEqual([])
    expect(listCauses()).toHaveLength(1)

    claimFounder(cause.id, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    addFounder(cause.id, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
    expect(getCause(cause.id)!.founders).toHaveLength(2)

    commitGoalEdit(cause.id, { text: 'Rivers are safe to swim in' })
    expect(primaryGoal(getCause(cause.id)!)?.text).toContain('safe to swim')

    addBelief(cause.id, 'Runoff is the main issue', { rationale: 'Data from EPA' })
    const withBelief = getCause(cause.id)!
    expect(withBelief.beliefs).toHaveLength(1)
    const parent = withBelief.beliefs[0]!.id
    addBelief(cause.id, 'Farms contribute most runoff', { supportsBeliefId: parent })
    expect(rootBeliefs(getCause(cause.id)!)).toHaveLength(1)
    expect(supportingBeliefs(getCause(cause.id)!, parent)).toHaveLength(1)

    addMilestone(cause.id, { title: 'Baseline tests', targetDate: '2026-12-01' })
    const ms = getCause(cause.id)!.timeline[0]!
    addMeasureToMilestone(cause.id, ms.id, {
      description: 'E. coli monthly average',
      kind: 'progress',
    })
    updateMilestone(cause.id, ms.id, { status: 'in_progress' })
    expect(getCause(cause.id)!.timeline[0]!.measures).toHaveLength(1)
    expect(getCause(cause.id)!.timeline[0]!.status).toBe('in_progress')

    addProjectLink(cause.id, {
      title: 'Community testing kit',
      milestoneIds: [ms.id],
    })
    const proj = getCause(cause.id)!.projects[0]!
    addProjectVolunteer(cause.id, proj.id, { role: 'Organizer' })
    addProjectSupporter(cause.id, proj.id, { name: 'Sam' })
    updateProjectStatus(cause.id, proj.id, 'progress')
    expect(getCause(cause.id)!.projects[0]!.volunteers).toHaveLength(1)
    expect(getCause(cause.id)!.projects[0]!.supporters).toHaveLength(1)
    expect(getCause(cause.id)!.projects[0]!.status).toBe('progress')
  })

  it('publishes goal/beliefs and keeps previous CIDs supportable', () => {
    const cause = createCause({ title: 'Publish path' })
    commitGoalEdit(cause.id, { text: 'Goal v1' })
    markGoalPublished(cause.id, 'bafygoal1')
    commitGoalEdit(cause.id, { text: 'Goal v2' })
    markGoalPublished(cause.id, 'bafygoal2')
    const targets = publishedGoalSupportTargets(getCause(cause.id)!)
    expect(targets.find((t) => t.isCurrent)?.cid).toBe('bafygoal2')
    expect(targets.some((t) => t.cid === 'bafygoal1' && !t.isCurrent)).toBe(true)

    addBelief(cause.id, 'Belief v1')
    const bid = getCause(cause.id)!.beliefs[0]!.id
    markBeliefPublished(cause.id, bid, 'bafybelief1')
    commitBeliefEdit(cause.id, bid, { text: 'Belief v2' })
    expect(draftStatements(getCause(cause.id)!).some((s) => s.id === bid)).toBe(true)
  })

  it('restores an older goal version', () => {
    const cause = createCause({ title: 'Restore' })
    commitGoalEdit(cause.id, { text: 'Version A' })
    markGoalPublished(cause.id, 'bafyA')
    commitGoalEdit(cause.id, { text: 'Version B' })
    markGoalPublished(cause.id, 'bafyB')
    const verA = getCause(cause.id)!.goal.history.find((v) => v.cid === 'bafyA')!
    restoreGoalVersion(cause.id, verA.id)
    expect(getCause(cause.id)!.goal.text).toBe('Version A')
    expect(getCause(cause.id)!.goal.cid).toBeUndefined()
  })

  it('exports/imports single and bundle; deletes cause from aggregates', () => {
    const a = createCause({ title: 'A' })
    const b = createCause({ title: 'B' })
    commitGoalEdit(a.id, { text: 'Goal A' })
    const json = exportCauseJson(a.id)!
    expect(JSON.parse(json).format).toBe(CAUSE_EXPORT_FORMAT)
    const imported = importCauseFromJson(json)
    expect(imported.title).toBe('A')
    expect(imported.id).not.toBe(a.id)

    const bundle = exportCausesBundleJson([a.id, b.id])
    expect(JSON.parse(bundle).format).toBe(CAUSE_BUNDLE_FORMAT)
    const many = importCausesFromJson(bundle)
    expect(many.kind).toBe('bundle')
    expect(many.causes).toHaveLength(2)

    const url = causePortableShareUrl(a.id, 'http://localhost:5175')
    expect(url).toContain('import-cause?d=')
    const d = url!.split('d=')[1]!
    expect(JSON.parse(decodePortableSharePayload(d)).cause.title).toBe('A')

    const agg = createAggregate('Bundle', '', [a.id])
    removeBelief(a.id, 'nope') // no-op safe
    removeMilestone(a.id, 'nope')
    removeProjectLink(a.id, 'nope')
    deleteCause(a.id)
    expect(getCause(a.id)).toBeNull()
    expect(listAggregates().find((x) => x.id === agg.id)?.causeIds).not.toContain(a.id)
    expect(listCauses().length).toBeGreaterThan(0)
  })

  it('migrates legacy multi-goal causes', () => {
    // Simulate old storage shape
    window.localStorage.setItem('ui3.causes.v1', JSON.stringify([{
      id: 'legacy1',
      title: 'Legacy',
      summary: '',
      founderAddress: '0xabc',
      goals: [
        { id: 'g1', role: 'goal', text: 'Main goal', history: [], createdAt: '2020-01-01', updatedAt: '2020-01-01' },
        { id: 'g2', role: 'goal', text: 'Extra goal as milestone', history: [], createdAt: '2020-01-01', updatedAt: '2020-01-01' },
      ],
      beliefs: [],
      measures: [{ id: 'm1', kind: 'progress', description: 'Old measure' }],
      projects: [{ id: 'p1', title: 'Old project', advancesGoalIds: [], status: 'active', createdAt: '2020-01-01' }],
      aggregateIds: [],
      history: [],
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    }]))
    const cause = getCause('legacy1')!
    expect(cause.goal.text).toBe('Main goal')
    expect(cause.founders).toEqual(['0xabc'])
    expect(cause.timeline.length).toBeGreaterThanOrEqual(1)
    expect(cause.projects[0]!.title).toBe('Old project')
    expect(cause.projects[0]!.volunteers).toEqual([])
  })
})
