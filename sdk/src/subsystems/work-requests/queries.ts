import type { SDKMachinery } from '../../machinery.js';
import { fetchAllRefUpdatedEvents } from '../../utils/eventCacheClient.js';
import { decodeMutableRefEvent } from '../../utils/event-decoders/mutable-refs.js';
import { getNote } from '../delegation/queries.js';
import { createDefaultDocumentReader } from '../displayable-documents/displayable-document.js';
import type { DisplayableDocument } from '../displayable-documents/displayable-document.js';
import { assembleWorkRequestBoard, type NoteBackingSnapshot, type WorkRefUpdate, type WorkRequestBoard } from './fold.js';
import { classifyWorkRefName } from './names.js';

export async function loadWorkRequestBoard(machinery: SDKMachinery, nowMs = Date.now()): Promise<WorkRequestBoard> {
  const raw = await fetchAllRefUpdatedEvents(machinery);
  const updates: WorkRefUpdate[] = [];
  for (const event of raw) {
    const decoded = decodeMutableRefEvent(event);
    if (!decoded || !classifyWorkRefName(decoded.refName)) continue;
    updates.push({
      owner: decoded.owner,
      name: decoded.refName,
      value: decoded.currentRefValue,
      blockNumber: decoded.blockNumber.toString(),
      logIndex: decoded.logIndex,
      timestamp: decoded.blockTimestamp.toString(),
    });
  }

  const reader = createDefaultDocumentReader(machinery);
  const documentsByCid = new Map<string, { document: DisplayableDocument; retracted: boolean }>();
  for (const cid of new Set(updates.map((update) => update.value.trim()).filter(Boolean))) {
    const result = await reader.read(cid as never);
    if (result.status === 'unavailable') throw new Error('Work-record documents are temporarily unavailable.');
    if (result.status === 'active') documentsByCid.set(cid, { document: result.document, retracted: false });
    else if (result.status === 'retracted') documentsByCid.set(cid, { document: result.retractedDocument, retracted: true });
  }

  const noteIds = new Set<string>();
  for (const entry of documentsByCid.values()) {
    const extras = entry.document.extras;
    if (extras && typeof extras.backingNoteId === 'string' && extras.backingNoteId) noteIds.add(extras.backingNoteId);
  }
  const notes: NoteBackingSnapshot[] = [];
  for (const id of noteIds) {
    const note = await getNote(machinery, id);
    if (!note) continue;
    notes.push({
      id: note.id,
      active: note.active,
      tokenType: note.tokenType,
      token: note.token,
      amount: note.amount,
      owner: note.owner,
    });
  }

  return assembleWorkRequestBoard({
    updates,
    documentsByCid,
    notes,
    settlementTokens: machinery.settlementTokenAddresses ?? [],
    nowMs,
    chainId: machinery.defaultChainId ?? machinery.publicClient?.chain?.id ?? 31337,
  });
}
