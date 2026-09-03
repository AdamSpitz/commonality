/**
 * Statement-level bridge triples for a human mediator with no parent causes
 * and no HTTP service. Same editorial job as a cluster; same listener address.
 * See specs/product/bridge-cluster-as-nudger.md Slice 3.
 */

export interface TripleSide {
  label: string
  /** Existing statement CID people already signed, if any. */
  parentCid: string
  /** New parent wording when there is no CID yet. */
  parentText: string
  modifiedText: string
  modifiedCid: string
}

export interface TripleDraft {
  mediatorName: string
  mediatorNote: string
  sideA: TripleSide
  sideB: TripleSide
  commonGroundText: string
  commonGroundCid: string
}

export function emptyTripleSide(label: string): TripleSide {
  return { label, parentCid: '', parentText: '', modifiedText: '', modifiedCid: '' }
}

export function emptyTripleDraft(): TripleDraft {
  return {
    mediatorName: '',
    mediatorNote: '',
    sideA: emptyTripleSide('One side'),
    sideB: emptyTripleSide('The other side'),
    commonGroundText: '',
    commonGroundCid: '',
  }
}

export function parentCidOrEmpty(side: TripleSide): string {
  return side.parentCid.trim()
}

export function textsToPublish(draft: TripleDraft): { key: string; text: string }[] {
  const items: { key: string; text: string }[] = []
  for (const [key, side] of [['sideA', draft.sideA], ['sideB', draft.sideB]] as const) {
    if (!side.parentCid.trim() && side.parentText.trim()) {
      items.push({ key: `${key}.parent`, text: side.parentText.trim() })
    }
    if (side.modifiedText.trim() && !side.modifiedCid.trim()) {
      items.push({ key: `${key}.modified`, text: side.modifiedText.trim() })
    }
  }
  if (draft.commonGroundText.trim() && !draft.commonGroundCid.trim()) {
    items.push({ key: 'commonGround', text: draft.commonGroundText.trim() })
  }
  return items
}

export function applyPublishedCids(
  draft: TripleDraft,
  published: Record<string, string>,
): TripleDraft {
  const next: TripleDraft = {
    ...draft,
    sideA: { ...draft.sideA },
    sideB: { ...draft.sideB },
  }
  if (published['sideA.parent']) next.sideA.parentCid = published['sideA.parent']
  if (published['sideA.modified']) next.sideA.modifiedCid = published['sideA.modified']
  if (published['sideB.parent']) next.sideB.parentCid = published['sideB.parent']
  if (published['sideB.modified']) next.sideB.modifiedCid = published['sideB.modified']
  if (published.commonGround) next.commonGroundCid = published.commonGround
  return next
}

export function validateTripleForPublish(draft: TripleDraft): string | null {
  if (!draft.mediatorName.trim()) return 'Name the mediator. Authorship has to be loud.'
  for (const side of [draft.sideA, draft.sideB]) {
    if (!side.modifiedText.trim() && !side.modifiedCid.trim()) {
      return `Write a modified wording for “${side.label || 'this side'}”.`
    }
    if (!side.parentCid.trim() && !side.parentText.trim()) {
      return `Give “${side.label || 'this side'}” an existing parent CID or write the parent wording.`
    }
  }
  if (!draft.commonGroundText.trim() && !draft.commonGroundCid.trim()) {
    return 'Write the shared ground both modified wordings should imply.'
  }
  return null
}

export function parentToModifiedFromTriple(draft: TripleDraft): { targetStatementCid: string; suggestedStatementCid: string }[] {
  const pairs: { targetStatementCid: string; suggestedStatementCid: string }[] = []
  for (const side of [draft.sideA, draft.sideB]) {
    const parent = side.parentCid.trim()
    const modified = side.modifiedCid.trim()
    if (parent && modified && parent !== modified) {
      pairs.push({ targetStatementCid: parent, suggestedStatementCid: modified })
    }
  }
  return pairs
}

export function modifiedToCommonFromTriple(draft: TripleDraft): { fromCid: string; toCid: string }[] {
  const common = draft.commonGroundCid.trim()
  if (!common) return []
  return [draft.sideA, draft.sideB]
    .map((side) => side.modifiedCid.trim())
    .filter((cid) => cid && cid !== common)
    .map((fromCid) => ({ fromCid, toCid: common }))
}
