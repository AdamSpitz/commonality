# Noninflammatory writeups supporting a statement

Status: design agreed at the high-level shape; not yet implemented. Hand this to a
fresh LLM to implement once the shape below is settled.

## Goal

Let the noninflammatory-content attester vouch that a piece of content C is **a
noninflammatory writeup that actually makes the case for statement S** — and surface
that link in both directions:

- **Tally UI** — when viewing statement S (or a nudge toward S), show the
  noninflammatory writeups that support it.
- **Content Funding UI** — when viewing content C, show which statement(s) it has been
  attested as supporting.

## The key design decision: two decoupled claims, not one bundled one

"Is C noninflammatory?" and "does C make the case for S?" are two **different
judgments** — different difficulty, different reliability, and one is a property of C
alone while the other is relational. We keep them as two separate, composable alignment
attestations rather than one bundled attestation.

- **"C is noninflammatory"** → `alignment(subject = C, statement = <attester's
  noninflammatory meta-statement>)`. No substantive S required. This is the standalone
  civility claim; it serves people who just want to read/fund noninflammatory content
  with no particular proposition in mind.
- **"C supports S"** → `alignment(subject = C, statement = S)`, one per statement,
  judged on a relevance/support dimension.

**"Noninflammatory writeup supporting S"** is then the *conjunction* of the two,
composed at query/UI time. If you want a single attester to vouch for the whole
package, require both attestations to come from the same attester address.

### Why decoupled rather than bundled

1. **No redundant re-judging.** One C can support S1, S2, S3. Bundling would re-evaluate
   civility once per statement — wasteful, and it can return inconsistent civility
   verdicts for the same content across different S.
2. **No degenerate support.** If S merely paraphrases C, "does C support S?" is
   trivially yes; bundling adds ceremony without a real judgment in exactly that case.
3. **Separable reliability.** A civility attester you trust is not necessarily a good
   relevance/support judge. Decoupling lets thresholds — and even the attesters —
   differ.
4. **No forced S.** Content that isn't aimed at one proposition still gets a clean
   standalone civility attestation.

The on-chain contract (`AlignmentAttestations.sol`) is already generic — a subject
aligns with *a* statement — so both claim types are first-class with no contract change.

### Fixing the current conflation

Today the service writes `statementId = S` (the statement page the content was submitted
under) but the LLM only judges noninflammatory-ness — so the on-chain record *implies* a
C→S relationship the AI never checked. This design fixes that: a noninflammatory verdict
points at the **noninflammatory meta-statement**, and a C→S link is only written when the
AI actually judged support for S.

## Behavior when both judgments run in one request

Given (C, S), the attester does both judgments in a single request and emits **up to two**
attestations:

- `alignment(C, noninflammatory-meta)` — published iff C is noninflammatory.
- `alignment(C, S)` — published iff the support judgment passes (and, per the existing
  policy, the publish only happens for sufficiently confident positive decisions).

Given C with no S, it emits just the noninflammatory attestation.

**A `support = fail` does NOT block the standalone noninflammatory attestation.** C is
still noninflammatory; it just doesn't support *that* S. This is the decoupling paying
off.

## Implementation sketch

No contract, event, or indexer-schema change. The indexer already caches
`AlignmentAttestation` events; derived data is folded client-side in the SDK.

### 1. Attester service (`content-attester/`) — the substantive work

- `app.ts`: it already receives `statementCid`. When present, **fetch S's statement text
  from IPFS** (attester-core already has IPFS read used for content resolution) and pass
  it to the evaluator. Emit the two attestations described above.
- `evaluator.ts`: add a `statement?: string` param and a `{statement}` placeholder in
  `buildContentAttesterPrompt`. Add a `supports_statement` dimension to the result. Keep
  the noninflammatory `decision` independent of support; compute a separate support
  decision used to gate the `alignment(C, S)` attestation.
- `prompts/*.md` (all three personas: perspective-neutral, left-evaluating-right,
  right-evaluating-left): add a "does this content actually make the case for the target
  statement?" section, the `{statement}` placeholder, and
  `"supports_statement": "pass"|"fail"|"partial"` in the JSON schema. Keep the
  conservative "lean no if borderline" framing. The `{statement}` block must be optional
  — when no S is supplied, the prompt judges civility only.
  - Semantics of "support" = *argues for / advances S to a reader*, not merely
    "on-topic". An irrelevant-but-civil writeup should NOT show up under S.

### 2. SDK (`sdk/src/subsystems/content-funding/queries.ts`)

- Add `getStatementSupportingContent(machinery, statementCid, …)`: a mirror of the
  existing `getContentAttestations`, but filter the event cache by `topic3 = statementId`
  (S) instead of `topic2 = subjectId`. Restrict to the noninflammatory topic and/or the
  trusted content-attester set. Returns content items + attester records.
- For the Tally view, join these C→S support attestations against the **noninflammatory**
  attestations on the same C's, so the UI can show "civil writeups that actually argue
  for this," with both signals visible.

### 3. Tally UI (`ui/src/`) — the net-new surface

- A "Noninflammatory writeups supporting this statement" section on the conceptspace
  statement view (`ui/src/conceptspace/pages/StatementPage.tsx`) and the nudge-toward-S
  view, backed by the new SDK query, resolving content metadata, reusing the attester-chip
  patterns from `ui/src/content-funding/components/ContentAttestationSummary.tsx`.

### 4. Content Funding UI

- In `ContentAttestationSummary.tsx`, surface the `supports_statement` dimension +
  reasoning in the chip/tooltip (the judgment is now real), and resolve the raw
  `statementCid` to readable statement text.

### 5. Specs/docs to update

- `content-attesters.md`, this directory's `README.md`, `attester-prompts.md`, and
  `docs/end-user/civility/evaluator-prompts.md` — describe the two-claim model (today they
  describe noninflammatory-only).

## Open questions to settle before implementing

- (none currently — fill in as they come up)
