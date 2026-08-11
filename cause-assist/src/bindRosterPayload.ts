/**
 * Bind an attest request to published content before judgment.
 *
 * Structure (title/summary/plankCids/mediatorBlurb) is bound by recomputing the
 * roster CID. Plank *texts* are loaded by CID so free-form strings cannot mint a
 * badge for unrelated issue content.
 */

import type { CoherenceCheckRequest } from './coherenceCheck.js'
import { previewRosterCid, type RosterFields } from './rosterDocument.js'

export type BindRosterFailureReason = 'roster_mismatch' | 'roster_unavailable'

export type LoadStatementText = (plankCid: string) => Promise<string | null>

export type BindRosterResult =
  | { ok: true; payload: CoherenceCheckRequest }
  | { ok: false; reason: BindRosterFailureReason }

export interface BoundAttestRequest {
  rosterCid: string
  title: string
  summary: string
  plankCids: string[]
  mediatorBlurb?: string
}

export async function bindRosterPayload(
  request: BoundAttestRequest,
  loadStatementText: LoadStatementText,
): Promise<BindRosterResult> {
  const fields: RosterFields = {
    title: request.title,
    summary: request.summary,
    plankCids: [...request.plankCids],
    mediatorBlurb: request.mediatorBlurb ?? '',
  }

  let expectedCid: string
  try {
    expectedCid = previewRosterCid(fields)
  } catch {
    return { ok: false, reason: 'roster_mismatch' }
  }

  if (expectedCid !== request.rosterCid.trim()) {
    return { ok: false, reason: 'roster_mismatch' }
  }

  if (fields.plankCids.length === 0) {
    return { ok: false, reason: 'roster_mismatch' }
  }

  const planks: string[] = []
  for (const cid of fields.plankCids) {
    const text = await loadStatementText(cid)
    if (text === null) {
      return { ok: false, reason: 'roster_unavailable' }
    }
    const trimmed = text.trim()
    if (!trimmed) {
      return { ok: false, reason: 'roster_unavailable' }
    }
    planks.push(trimmed)
  }

  return {
    ok: true,
    payload: {
      rosterCid: request.rosterCid.trim(),
      title: fields.title,
      summary: fields.summary,
      planks,
      mediatorBlurb: fields.mediatorBlurb,
    },
  }
}
