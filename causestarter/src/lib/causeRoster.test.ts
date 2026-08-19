import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefUpdate } from '@commonality/sdk/mutable-refs'

const getSubjectStatements = vi.hoisted(() => vi.fn())
const documentRead = vi.hoisted(() => vi.fn())
const getStatementWithContent = vi.hoisted(() => vi.fn())
vi.mock('@commonality/sdk/fundingportals', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSubjectStatements,
}))
vi.mock('@commonality/sdk/displayable-documents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createDefaultDocumentReader: () => ({ read: documentRead }),
}))
vi.mock('@commonality/sdk/conceptspace', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getStatementWithContent,
}))

import {
  applyPlankTexts,
  buildRosterDocument,
  readPlankText,
  formatRosterAge,
  loadRosterCoherenceBadge,
  mediatorBlurbFrom,
  normalizeSlug,
  parseCauseRouteParams,
  parseRosterDocument,
  placeholderPlanksFromCids,
  plankAddedLaterLabels,
  plankFirstSeenInHistory,
  previewRosterCid,
  renderRosterContent,
  ROSTER_COHERENCE_CLAIM,
  ROSTER_COHERENCE_TOPIC,
  rosterFieldsFromCause,
  rosterSubjectId,
  stableCausePath,
  textFromStatementDocument,
  validateSlug,
} from './causeRoster'
import type { CauseDraft } from './causeStore'

function draft(partial: Partial<CauseDraft> & { planks: CauseDraft['planks'] }): CauseDraft {
  return {
    id: 'local-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('causeRoster', () => {
  it('normalizes and validates slugs', () => {
    expect(normalizeSlug('  Free the Oaks! ')).toBe('free-the-oaks')
    expect(validateSlug('free-the-oaks')).toBeNull()
    expect(validateSlug('created-statements')).toMatch(/reserved/i)
    expect(validateSlug('bookmarks')).toMatch(/reserved/i)
    expect(validateSlug('bookmarked-causes')).toMatch(/reserved/i)
    expect(validateSlug('Bad_Slug')).toMatch(/lowercase/i)
    expect(validateSlug('')).toMatch(/slug/i)
  })

  it('builds roster fields from all founder-authored display text', () => {
    const cause = draft({
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      mediator: {
        name: 'Oak Bridge',
        description: 'Local opt-in bridge',
        address: '0x1111111111111111111111111111111111111111',
        serviceUrl: 'https://bridge.example',
      },
      planks: [
        { id: 'a', text: 'Repair lights by June.', origin: 'user', cid: 'bafyplank1' },
        { id: 'b', text: 'Paint crosswalks.', origin: 'user', cid: 'bafyplank2' },
        { id: 'c', text: 'Unpublished idea.', origin: 'user' },
      ],
    })
    const fields = rosterFieldsFromCause(cause)
    expect(fields.bridgeCluster).toBeUndefined()
    expect(fields).toEqual({
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1', 'bafyplank2'],
      mediatorBlurb: 'Oak Bridge: Local opt-in bridge',
      mediator: {
        name: 'Oak Bridge',
        description: 'Local opt-in bridge',
        address: '0x1111111111111111111111111111111111111111',
        serviceUrl: 'https://bridge.example',
      },
    })
  })

  it('falls back to the first published plank for title', () => {
    const cause = draft({
      planks: [
        { id: 'a', text: 'Repair lights by June.', origin: 'user', cid: 'bafyplank1' },
      ],
    })
    expect(rosterFieldsFromCause(cause).title).toBe('Repair lights by June.')
  })

  it('embeds structured fields in a displayable document and round-trips', () => {
    const fields = {
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1', 'bafyplank2'],
      mediatorBlurb: 'Oak Bridge: Local opt-in bridge',
    }
    const doc = buildRosterDocument(fields)
    expect(doc.format).toBe('markdown-restricted')
    expect(doc.content).toContain('# Oak Street lights')
    expect(doc.references?.map((r) => r.cid)).toEqual(['bafyplank1', 'bafyplank2'])
    expect(parseRosterDocument(doc)).toEqual(fields)
    expect(previewRosterCid(fields)).toMatch(/^bafkrei/)
    // Same bytes → same CID
    expect(previewRosterCid(fields)).toBe(previewRosterCid(fields))
  })

  it('omits bridge-cluster extras unless the roster is a modified or bridge cause', () => {
    const base = {
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1'],
      mediatorBlurb: '',
    }
    const linked = {
      ...base,
      bridgeCluster: {
        clusterOwner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
        clusterSlug: 'settlement',
        role: 'modified' as const,
        parentOwner: '0x1111111111111111111111111111111111111111' as const,
        parentSlug: 'natural-left',
      },
    }
    expect(previewRosterCid(base)).not.toBe(previewRosterCid(linked))
    expect(parseRosterDocument(buildRosterDocument(linked))?.bridgeCluster?.role).toBe('modified')
    expect(parseRosterDocument(buildRosterDocument(base))?.bridgeCluster).toBeUndefined()
  })

  it('omits combinator graph handles unless a view was promoted', () => {
    const base = {
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1', 'bafyplank2'],
      mediatorBlurb: '',
    }
    const promoted = {
      ...base,
      anchors: [
        {
          combinator: 'any' as const,
          cid: 'bafkreianycombo',
          operandCids: ['bafyplank1', 'bafyplank2'],
        },
      ],
    }
    expect(previewRosterCid(base)).not.toBe(previewRosterCid(promoted))
    expect(parseRosterDocument(buildRosterDocument(promoted))?.anchors).toEqual([
      {
        combinator: 'any',
        cid: 'bafkreianycombo',
        operandCids: ['bafyplank1', 'bafyplank2'],
      },
    ])
    expect(parseRosterDocument(buildRosterDocument(base))?.anchors).toBeUndefined()
  })

  it('drops anchors that cannot say which selection minted them', () => {
    const base = {
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1', 'bafyplank2'],
      mediatorBlurb: '',
    }
    // The pre-operand shape, and an anchor over a single operand, are both
    // unshowable: nothing ties them to a selection.
    const doc = buildRosterDocument({
      ...base,
      anchors: [
        { combinator: 'any', cid: 'bafkreilegacy' },
        { combinator: 'all', cid: 'bafkreithin', operandCids: ['bafyplank1'] },
      ] as never,
    })
    expect(parseRosterDocument(doc)?.anchors).toBeUndefined()
  })

  it('voids preview CID when any founder display field changes', () => {
    const base = {
      title: 'A',
      summary: 'B',
      plankCids: ['bafy1'],
      mediatorBlurb: 'C',
    }
    const cid = previewRosterCid(base)
    expect(previewRosterCid({ ...base, title: 'A2' })).not.toBe(cid)
    expect(previewRosterCid({ ...base, summary: 'B2' })).not.toBe(cid)
    expect(previewRosterCid({ ...base, plankCids: ['bafy1', 'bafy2'] })).not.toBe(cid)
    expect(previewRosterCid({ ...base, mediatorBlurb: 'C2' })).not.toBe(cid)
  })

  describe('published mediator identity', () => {
    const mediator = {
      name: 'Oak Bridge',
      description: 'Local opt-in bridge',
      address: '0x1111111111111111111111111111111111111111',
      serviceUrl: 'https://bridge.example',
    }
    const base = { title: 'A', summary: 'B', plankCids: ['bafy1'], mediatorBlurb: 'C' }

    it('round-trips the mediator so followers can reach the service', () => {
      // The bug this guards: followers hydrate from the roster and have no local copy,
      // so an address/serviceUrl that never got published means no opt-in is possible.
      const parsed = parseRosterDocument(buildRosterDocument({ ...base, mediator }))
      expect(parsed?.mediator).toEqual(mediator)
    })

    it('leaves mediator-less roster CIDs unchanged', () => {
      expect(previewRosterCid({ ...base, mediator: undefined })).toBe(previewRosterCid(base))
    })

    it('changes the CID when the mediator changes', () => {
      expect(previewRosterCid({ ...base, mediator })).not.toBe(previewRosterCid(base))
      expect(previewRosterCid({ ...base, mediator: { ...mediator, serviceUrl: 'https://other.example' } }))
        .not.toBe(previewRosterCid({ ...base, mediator }))
    })

    it('parses rosters published before the field existed', () => {
      expect(parseRosterDocument(buildRosterDocument(base))?.mediator).toBeUndefined()
    })

    it('drops malformed or partial mediators rather than trusting them', () => {
      for (const bad of [
        { ...mediator, address: 'not-an-address' },
        { ...mediator, serviceUrl: 'javascript:alert(1)' },
        { ...mediator, description: '' },
        'nonsense',
      ]) {
        const doc = buildRosterDocument({ ...base, mediator: bad as never })
        expect(parseRosterDocument(doc)?.mediator).toBeUndefined()
      }
    })
  })

  it('parses stable routes with optional version pin', () => {
    const owner = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01'
    expect(parseCauseRouteParams(owner, 'oak-street')).toEqual({
      owner: owner.toLowerCase(),
      slug: 'oak-street',
      versionCid: undefined,
    })
    expect(parseCauseRouteParams(owner, 'oak-street@bafkreiversion')).toEqual({
      owner: owner.toLowerCase(),
      slug: 'oak-street',
      versionCid: 'bafkreiversion',
    })
    expect(parseCauseRouteParams('not-an-address', 'oak-street')).toBeNull()
    expect(stableCausePath({
      owner: owner.toLowerCase() as `0x${string}`,
      slug: 'oak-street',
    }, 'bafkreiversion')).toBe(
      `/cause/${owner.toLowerCase()}/oak-street@bafkreiversion`,
    )
  })

  it('formats roster ages for history copy', () => {
    const now = Date.parse('2026-08-10T12:00:00.000Z')
    expect(formatRosterAge('2026-08-10T11:59:30.000Z', now)).toBe('just now')
    expect(formatRosterAge('2026-08-07T12:00:00.000Z', now)).toBe('3 days ago')
  })

  it('renders mediator blurb from name and description only', () => {
    expect(mediatorBlurbFrom(undefined)).toBe('')
    expect(mediatorBlurbFrom({
      name: 'Bridge',
      description: 'Helps neighbors opt in',
      address: '0x1',
      serviceUrl: 'https://x.test',
    })).toBe('Bridge: Helps neighbors opt in')
  })

  it('keeps plank order in rendered content', () => {
    const content = renderRosterContent({
      title: 'T',
      summary: '',
      plankCids: ['cid-a', 'cid-b'],
      mediatorBlurb: '',
    })
    expect(content.indexOf('cid-a')).toBeLessThan(content.indexOf('cid-b'))
  })

  it('pins well-known coherence topic and claim CIDs', () => {
    expect(ROSTER_COHERENCE_TOPIC).toMatch(/^bafkrei/)
    expect(ROSTER_COHERENCE_CLAIM).toMatch(/^bafkrei/)
    expect(ROSTER_COHERENCE_TOPIC).not.toBe(ROSTER_COHERENCE_CLAIM)
    expect(ROSTER_COHERENCE_TOPIC).toBe('bafkreigcuduguak3tvfltu56ggksxheukrqtbvf22zntpb7uibbpni27zm')
    expect(ROSTER_COHERENCE_CLAIM).toBe('bafkreiddm4nvelu26hac2hqc6gpaegbrvcjfficxoddgnhjxedokngrv6a')
  })

  it('derives roster subject id from CID digest', () => {
    const cid = previewRosterCid({
      title: 'T',
      summary: 'S',
      plankCids: ['bafyplank1'],
      mediatorBlurb: '',
    })
    expect(rosterSubjectId(cid)).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('marks planks added after the first roster version', async () => {
    const owner = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const v1: RefUpdate = {
      id: `${owner}:oak:1:0`,
      owner,
      name: 'oak',
      value: 'bafyroster1',
      blockNumber: '1',
      timestamp: '1700000000',
      transactionHash: '0x1',
      logIndex: 0,
    }
    const v2: RefUpdate = {
      id: `${owner}:oak:2:0`,
      owner,
      name: 'oak',
      value: 'bafyroster2',
      blockNumber: '2',
      timestamp: '1700086400',
      transactionHash: '0x2',
      logIndex: 0,
    }
    // Newest-first history (matches getUserRefHistory)
    const history = [v2, v1]
    const fieldsByCid: Record<string, { title: string; summary: string; plankCids: string[]; mediatorBlurb: string }> = {
      bafyroster1: {
        title: 'T', summary: 'S', plankCids: ['plank-a'], mediatorBlurb: '',
      },
      bafyroster2: {
        title: 'T', summary: 'S', plankCids: ['plank-a', 'plank-b'], mediatorBlurb: '',
      },
    }
    const firstSeen = await plankFirstSeenInHistory(history, (cid) => fieldsByCid[cid] ?? null)
    expect(firstSeen.get('plank-a')?.value).toBe('bafyroster1')
    expect(firstSeen.get('plank-b')?.value).toBe('bafyroster2')

    const labels = plankAddedLaterLabels(history, firstSeen, Number(v2.timestamp) * 1000 + 60_000)
    expect(labels.has('plank-a')).toBe(false)
    expect(labels.get('plank-b')).toMatch(/Added later/i)
  })

  it('builds CID placeholders so a cause page can paint before bodies load', () => {
    expect(placeholderPlanksFromCids(['bafy1', 'bafy2'])).toEqual([
      { id: 'plank:bafy1', text: 'bafy1', origin: 'user', cid: 'bafy1' },
      { id: 'plank:bafy2', text: 'bafy2', origin: 'user', cid: 'bafy2' },
    ])
  })

  it('reads statement body text from a displayable document', () => {
    expect(textFromStatementDocument({ format: 'text/plain', content: '  Repair the lights.  ' } as never)).toBe(
      'Repair the lights.',
    )
    expect(textFromStatementDocument({
      format: 'markdown-restricted',
      content: { content: '  Nested body.  ' },
    } as never)).toBe('Nested body.')
    expect(textFromStatementDocument({ format: 'text/plain', title: '  From title  ' } as never)).toBe(
      'From title',
    )
    expect(textFromStatementDocument(undefined)).toBe('')
  })

  it('resolves plank body text via the statement loader when the document reader misses', async () => {
    documentRead.mockResolvedValue({ status: 'not-published' })
    getStatementWithContent.mockResolvedValue({
      content: { format: 'markdown-restricted', content: 'Repair the lights.' },
    })
    await expect(readPlankText({} as never, 'bafy1')).resolves.toBe('Repair the lights.')
  })

  it('applies resolved plank texts without clobbering local edits', () => {
    const planks = [
      { id: 'plank:a', text: 'bafya', origin: 'user' as const, cid: 'bafya' },
      { id: 'plank:b', text: 'Keep my local wording', origin: 'user' as const, cid: 'bafyb' },
      { id: 'draft', text: 'Unpublished', origin: 'user' as const },
    ]
    const texts = new Map([
      ['bafya', 'Published issue A'],
      ['bafyb', 'Published issue B'],
    ])
    expect(applyPlankTexts(planks, texts)).toEqual([
      { id: 'plank:a', text: 'Published issue A', origin: 'user', cid: 'bafya' },
      { id: 'plank:b', text: 'Keep my local wording', origin: 'user', cid: 'bafyb' },
      { id: 'draft', text: 'Unpublished', origin: 'user' },
    ])
  })

  describe('loadRosterCoherenceBadge', () => {
    const OPERATOR = '0x1111111111111111111111111111111111111111' as const
    const FOUNDER = '0x2222222222222222222222222222222222222222' as const
    const rosterCid = previewRosterCid({
      title: 'Oak Street', summary: 'S', plankCids: ['bafy1'], mediatorBlurb: '',
    })
    const machinery = {} as never

    beforeEach(() => {
      getSubjectStatements.mockClear()
    })

    const attestation = (attester: string) => ({
      attester,
      statementCid: ROSTER_COHERENCE_CLAIM,
      topicCid: ROSTER_COHERENCE_TOPIC,
      subjectId: rosterSubjectId(rosterCid),
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    it('ignores coherence claims attested by anyone but the operator', async () => {
      getSubjectStatements.mockResolvedValueOnce([attestation(FOUNDER)])
      expect(await loadRosterCoherenceBadge(machinery, rosterCid, OPERATOR)).toBeNull()
    })

    it('shows the badge for the operator and drops other attesters', async () => {
      getSubjectStatements.mockResolvedValueOnce([
        attestation(FOUNDER),
        attestation(OPERATOR),
      ])
      const badge = await loadRosterCoherenceBadge(machinery, rosterCid, OPERATOR)
      expect(badge?.attesters).toEqual([OPERATOR])
    })

    it('shows no badge when the operator address is unknown', async () => {
      getSubjectStatements.mockResolvedValueOnce([attestation(FOUNDER)])
      expect(await loadRosterCoherenceBadge(machinery, rosterCid, null)).toBeNull()
      expect(getSubjectStatements).not.toHaveBeenCalled()
    })
  })
})
