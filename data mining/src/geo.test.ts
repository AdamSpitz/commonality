import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyGeoFilter,
  geoFilterActive,
  geoPromptBlock,
  inferGeoLevel,
  scopedQuery,
} from './geo.js'

describe('inferGeoLevel', () => {
  it('picks the most specific matching scale', () => {
    assert.equal(
      inferGeoLevel('Our neighborhood association wants a 20 mph speed limit on Oak Street.'),
      'neighborhood',
    )
    assert.equal(
      inferGeoLevel('I want the City of Bowling Green to keep a walkable downtown.'),
      'town',
    )
    assert.equal(
      inferGeoLevel('The county commission should fund a rural transit loop.'),
      'county-parish',
    )
    assert.equal(
      inferGeoLevel('The state legislature should legalize mid-rise housing statewide.'),
      'state-province',
    )
    assert.equal(
      inferGeoLevel('Congress should expand the Housing Choice Voucher program nationwide.'),
      'national',
    )
    assert.equal(
      inferGeoLevel('Every country should treat adequate housing as a human right.'),
      'global',
    )
  })

  it('returns null when the scale is unclear', () => {
    assert.equal(inferGeoLevel('I want more housing that working families can afford.'), null)
  })
})

describe('scopedQuery', () => {
  it('leaves the query alone when every level is selected', () => {
    assert.equal(
      scopedQuery('housing', ['global', 'national', 'state-province', 'county-parish', 'town', 'neighborhood']),
      'housing',
    )
  })

  it('adds scale terms when the filter is narrow', () => {
    const q = scopedQuery('housing', ['town', 'neighborhood'])
    assert.match(q, /^housing \(/)
    assert.match(q, /city OR town/)
    assert.match(q, /neighborhood/)
  })
})

describe('geoPromptBlock', () => {
  it('is empty unless the filter is active', () => {
    assert.equal(geoPromptBlock([]), '')
    assert.match(geoPromptBlock(['town']), /Town/)
    assert.doesNotMatch(geoPromptBlock(['town']), /Global/)
  })
})

describe('applyGeoFilter', () => {
  it('drops confident mismatches and keeps unknown scale', () => {
    const rows = applyGeoFilter([
      { type: 'plank', text: 'Every country should fund public housing.', sourceId: 't', sourceName: 't' },
      { type: 'plank', text: 'I want the City of Denver to rezone for mid-rise near transit.', sourceId: 't', sourceName: 't' },
      { type: 'plank', text: 'I want more homes that working families can afford.', sourceId: 't', sourceName: 't' },
    ], ['town'])
    assert.equal(rows.length, 2)
    assert.ok(rows.some((row) => /Denver/.test(row.text)))
    assert.ok(rows.some((row) => /working families/.test(row.text)))
    assert.ok(!rows.some((row) => /Every country/.test(row.text)))
  })

  it('is inactive when no levels are passed', () => {
    assert.equal(geoFilterActive([]), false)
    const rows = applyGeoFilter([
      { type: 'belief', text: 'Every country should treat housing as a right.', sourceId: 't', sourceName: 't' },
    ], [])
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.geoLevel, 'global')
  })
})
