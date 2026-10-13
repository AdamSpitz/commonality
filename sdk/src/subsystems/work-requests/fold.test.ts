import assert from 'node:assert/strict';
import {
  assembleWorkRequestBoard,
  decisionFor,
  totalsForRequest,
  type NoteBackingSnapshot,
  type WorkRefUpdate,
} from './fold.js';
import {
  buildContributionLinkDocument,
  buildWorkAcceptanceDocument,
  buildWorkDecisionDocument,
  buildWorkOfferDocument,
  buildWorkRequestDocument,
  buildWorkResponseDocument,
  cidForWorkDocument,
} from './documents.js';
import { acceptanceRefName, contributionLinkRefName, decisionRefName, offerRefName, requestRefName, responseRefName } from './names.js';
import type { DisplayableDocument } from '../displayable-documents/displayable-document.js';

const DONOR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ALICE = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const BOB = '0xcccccccccccccccccccccccccccccccccccccccc';
const USDC = '0x1111111111111111111111111111111111111111';
const PROJECT_A = '0x2222222222222222222222222222222222222222';
const PROJECT_B = '0x3333333333333333333333333333333333333333';
const NOW = Date.parse('2026-10-01T00:00:00Z');

function docEntry(document: DisplayableDocument) {
  return [cidForWorkDocument(document), { document, retracted: false }] as const;
}

describe('fundable work requests', () => {
  it('keeps the playground offers, competing responses, decline, contribution, and withdrawn backing distinct', () => {
    const request = buildWorkRequestDocument({
      slug: 'cedarvale-playground',
      outcome: 'An accessible playground in Cedarvale Park',
      requirements: ['public access', 'no party branding', 'maintenance plan'],
      participationLimits: ['funding this does not endorse unrelated politics'],
      statementCids: [],
      contextNote: 'Bridge cluster agreed the requirements.',
      responseDeadline: '2026-12-01T00:00:00Z',
      previousCid: null,
    });
    const requestCid = cidForWorkDocument(request);
    const revised = buildWorkRequestDocument({
      slug: 'cedarvale-playground',
      outcome: 'An accessible playground in Cedarvale Park with a quiet corner',
      requirements: ['public access', 'no party branding', 'maintenance plan', 'quiet corner'],
      participationLimits: [],
      statementCids: [],
      contextNote: '',
      responseDeadline: null,
      previousCid: requestCid,
    });

    const backed = buildWorkOfferDocument({
      slug: 'set-aside',
      requestVersionCid: requestCid,
      amount: '8000000',
      token: USDC,
      chainId: 84532,
      expiry: '2026-12-01T00:00:00Z',
      approvalAuthority: 'offer-author',
      conditions: '',
      backingNoteId: '9',
      status: 'open',
      previousCid: null,
    });
    const withdrawn = buildWorkOfferDocument({
      slug: 'set-aside',
      requestVersionCid: requestCid,
      amount: '8000000',
      token: USDC,
      chainId: 84532,
      expiry: '2026-12-01T00:00:00Z',
      approvalAuthority: 'offer-author',
      conditions: '',
      backingNoteId: null,
      status: 'withdrawn',
      previousCid: cidForWorkDocument(backed),
    });
    const intention = buildWorkOfferDocument({
      slug: 'intention',
      requestVersionCid: requestCid,
      amount: '3000000',
      token: USDC,
      chainId: 84532,
      expiry: '2026-12-01T00:00:00Z',
      approvalAuthority: 'offer-author',
      conditions: '',
      backingNoteId: null,
      status: 'open',
      previousCid: null,
    });
    const secondBacked = buildWorkOfferDocument({
      slug: 'same-note',
      requestVersionCid: requestCid,
      amount: '8000000',
      token: USDC,
      chainId: 84532,
      expiry: '2026-12-01T00:00:00Z',
      approvalAuthority: 'offer-author',
      conditions: '',
      backingNoteId: '9',
      status: 'open',
      previousCid: null,
    });

    const responseA = buildWorkResponseDocument({
      slug: 'design-build',
      requestVersionCid: requestCid,
      chainId: 84532,
      projectAddress: PROJECT_A,
      providerAddress: ALICE,
      workItemIds: ['playground:design-build'],
      scope: 'Design and build the playground',
      exceptions: 'Does not include the quiet corner added later',
      capacity: 'Can start in November',
      previousCid: null,
    });
    const responseB = buildWorkResponseDocument({
      slug: 'design-build',
      requestVersionCid: requestCid,
      chainId: 84532,
      projectAddress: PROJECT_B,
      providerAddress: BOB,
      workItemIds: ['playground:other-design'],
      scope: 'A different design and build',
      exceptions: '',
      capacity: 'Can start in October',
      previousCid: null,
    });
    const acceptance = buildWorkAcceptanceDocument({
      responseOwner: ALICE,
      responseSlug: 'design-build',
      responseVersionCid: cidForWorkDocument(responseA),
      capacity: 'I will do this scope',
      previousCid: null,
    });
    const decline = buildWorkDecisionDocument({
      offerOwner: DONOR,
      offerSlug: 'intention',
      responseOwner: BOB,
      responseSlug: 'design-build',
      offerVersionCid: cidForWorkDocument(intention),
      responseVersionCid: cidForWorkDocument(responseB),
      outcome: 'decline',
      explanation: 'The design misses the access requirement.',
      previousCid: null,
    });
    const approval = buildWorkDecisionDocument({
      offerOwner: DONOR,
      offerSlug: 'intention',
      responseOwner: ALICE,
      responseSlug: 'design-build',
      offerVersionCid: cidForWorkDocument(intention),
      responseVersionCid: cidForWorkDocument(responseA),
      outcome: 'approve',
      explanation: '',
      previousCid: null,
    });
    const paid = buildContributionLinkDocument({
      slug: 'alice-payment',
      offerVersionCid: cidForWorkDocument(intention),
      responseVersionCid: cidForWorkDocument(responseA),
      chainId: 84532,
      projectAddress: PROJECT_A,
      txHash: `0x${'ab'.repeat(32)}`,
      amount: '3000000',
      token: USDC,
      refundTxHash: null,
      previousCid: null,
    });
    const refunded = buildContributionLinkDocument({
      slug: 'alice-payment',
      offerVersionCid: cidForWorkDocument(intention),
      responseVersionCid: cidForWorkDocument(responseA),
      chainId: 84532,
      projectAddress: PROJECT_A,
      txHash: `0x${'ab'.repeat(32)}`,
      amount: '3000000',
      token: USDC,
      refundTxHash: `0x${'cd'.repeat(32)}`,
      previousCid: cidForWorkDocument(paid),
    });

    const documents = new Map<string, { document: DisplayableDocument; retracted: boolean }>([
      docEntry(request),
      docEntry(revised),
      docEntry(backed),
      docEntry(withdrawn),
      docEntry(intention),
      docEntry(secondBacked),
      docEntry(responseA),
      docEntry(responseB),
      docEntry(acceptance),
      docEntry(decline),
      docEntry(approval),
      docEntry(paid),
      docEntry(refunded),
    ]);

    let log = 0;
    const updates: WorkRefUpdate[] = [];
    const push = (owner: string, name: string, document: DisplayableDocument) => {
      log += 1;
      updates.push({
        owner,
        name,
        value: cidForWorkDocument(document),
        blockNumber: '10',
        logIndex: log,
        timestamp: String(NOW / 1000),
      });
    };
    push(DONOR, requestRefName('cedarvale-playground'), request);
    push(DONOR, requestRefName('cedarvale-playground'), revised);
    push(DONOR, offerRefName('set-aside'), backed);
    push(DONOR, offerRefName('set-aside'), withdrawn);
    push(DONOR, offerRefName('intention'), intention);
    push(DONOR, offerRefName('same-note'), secondBacked);
    push(ALICE, responseRefName('design-build'), responseA);
    push(BOB, responseRefName('design-build'), responseB);
    push(ALICE, acceptanceRefName(ALICE, 'design-build'), acceptance);
    push(DONOR, decisionRefName(DONOR, 'intention', BOB, 'design-build'), decline);
    push(DONOR, decisionRefName(DONOR, 'intention', ALICE, 'design-build'), approval);
    push(DONOR, contributionLinkRefName('alice-payment'), paid);
    push(DONOR, contributionLinkRefName('alice-payment'), refunded);

    const note: NoteBackingSnapshot = {
      id: '9',
      active: true,
      tokenType: 0,
      token: USDC,
      amount: '8000000',
      owner: DONOR,
    };
    const stranger: NoteBackingSnapshot = { ...note, id: '10', owner: BOB };
    const board = assembleWorkRequestBoard({
      updates,
      documentsByCid: documents,
      notes: [note, stranger],
      settlementTokens: [USDC],
      nowMs: NOW,
    });

    const requestRecord = board.requests[0]!;
    assert.equal(requestRecord.versions.length, 2);
    assert.equal(requestRecord.current?.body.outcome.includes('quiet corner'), true);
    assert.equal(requestRecord.versions[0]?.body.requirements.includes('quiet corner'), false);

    const totals = totalsForRequest(board, requestRecord, NOW);
    assert.equal(totals.length, 1);
    assert.equal(totals[0]?.unfundedIntention, 3000000n);
    assert.equal(totals[0]?.verifiedBacking, 8000000n);
    assert.equal(totals[0]?.approved, 3000000n);
    assert.equal(totals[0]?.contributed, 0n);
    assert.equal(totals[0]?.refunded, 3000000n);

    const liveBacking = board.backing.filter((slice) => slice.recognized > 0n);
    assert.equal(liveBacking.length, 1);
    assert.equal(liveBacking[0]?.offerSlug, 'same-note');

    const alice = board.responses.find((response) => response.actor === ALICE);
    const bob = board.responses.find((response) => response.actor === BOB);
    const intentionOffer = board.offers.find((offer) => offer.slug === 'intention')!;
    assert.equal(decisionFor(board, intentionOffer, bob!)?.current?.body.outcome, 'decline');
    assert.equal(decisionFor(board, intentionOffer, alice!)?.current?.body.outcome, 'approve');
    assert.equal(board.acceptances[0]?.authorityMatchesProvider, true);
    assert.notEqual(alice?.current?.body.workItemIds[0], bob?.current?.body.workItemIds[0]);
  });

  it('does not treat another person\'s note or a receipt note as backing', () => {
    const request = buildWorkRequestDocument({
      slug: 'park',
      outcome: 'A park',
      requirements: [],
      participationLimits: [],
      statementCids: [],
      contextNote: '',
      responseDeadline: null,
      previousCid: null,
    });
    const offer = buildWorkOfferDocument({
      slug: 'borrowed',
      requestVersionCid: cidForWorkDocument(request),
      amount: '5',
      token: USDC,
      chainId: 1,
      expiry: '2026-12-01T00:00:00Z',
      approvalAuthority: 'offer-author',
      conditions: '',
      backingNoteId: '4',
      status: 'open',
      previousCid: null,
    });
    const documents = new Map([docEntry(request), docEntry(offer)]);
    const updates: WorkRefUpdate[] = [
      { owner: DONOR, name: requestRefName('park'), value: cidForWorkDocument(request), blockNumber: '1', logIndex: 0, timestamp: '1' },
      { owner: DONOR, name: offerRefName('borrowed'), value: cidForWorkDocument(offer), blockNumber: '1', logIndex: 1, timestamp: '1' },
    ];
    const receipt = assembleWorkRequestBoard({
      updates,
      documentsByCid: documents,
      notes: [{ id: '4', active: true, tokenType: 1, token: USDC, amount: '5', owner: DONOR }],
      settlementTokens: [USDC],
      nowMs: NOW,
    });
    assert.equal(receipt.backing[0]?.unavailableReason, 'not-settlement-note');

    const foreign = assembleWorkRequestBoard({
      updates,
      documentsByCid: documents,
      notes: [{ id: '4', active: true, tokenType: 0, token: USDC, amount: '5', owner: BOB }],
      settlementTokens: [USDC],
      nowMs: NOW,
    });
    assert.equal(foreign.backing[0]?.unavailableReason, 'author-lacks-authority');
  });
});
