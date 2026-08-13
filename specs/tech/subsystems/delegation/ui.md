# Delegation UI

The delegation UI lives in `ui/src/delegation/`. It uses the same stack as the rest of the app (React, MUI, wagmi/viem, queries via the SDK over the event cache + folds).

There are three pages: My Notes, Note Detail, and Deposit.

`NoteIntent` is currently dormant in the UI. The semantics that blocked it have now been settled — see [Note intent](#note-intent) below for the agreed rules and what still has to be built before the UI can display or collect intent again.


## My Notes Page

**Route:** `/notes`

Shows the connected user's delegatable notes from two perspectives: notes they currently control (as leaf owner) and notes they originally deposited (as root owner). These are two separate sections on the same page.

### Summary Cards

A row of summary cards at the top of the page for a quick overview:
- **Total Funds** — aggregated ETH amount across all notes the user controls
- **Active Notes** — count of active notes where the user is leaf owner
- **Acting as Delegate** — count of notes where the user is leaf owner but not root owner (i.e. someone else's money)
- **Deposited & Delegated** — count of notes the user deposited that are currently controlled by someone else

### "Notes I Control" section

Lists all active notes where the connected user is the current leaf owner. Uses `getNotesByOwner`. Each note shows:
- Note ID
- Amount (formatted as ETH or token amount)
- Token type indicator (ETH vs ERC1155 — if ERC1155, show the token contract and token ID)
- Whether it was delegated to you (i.e. you're not the root) — if so, show "delegated from [root address]"

Clicking a note goes to the Note Detail page.

An "actions" area on each note card (or via a menu) with quick actions:
- **Delegate** — opens an inline form or dialog: address field + amount field (pre-filled with full note amount, editable for partial delegation)
- **Revoke** — only shown if the note has been delegated further (i.e. the user delegated it to someone else and wants to take it back). Since the user is the leaf owner of these notes, this actually won't apply here — revocation is done from the "Notes I Deposited" section. (See below.)

### "Notes I Deposited" section

Lists all active notes where the connected user is the root owner. Uses `getNotesByRoot`. This may overlap with the first section (for undelegated notes), but it also shows notes that the user deposited and then delegated away — where someone else is now the leaf owner.

Each note shows:
- Note ID
- Amount
- Current leaf owner (with chain depth, e.g. "controlled by [address] (3 levels deep)")
- Status: "Undelegated" / "Delegated"

For delegated notes, a **Revoke** button is available. This calls `revokeNote` with the full delegation chain (obtained via `getDelegationChain`). Revoking brings control back to the root.

A **Reclaim** button is available on undelegated notes (where root = leaf), calling `reclaimFunds` to withdraw the funds back to the user's wallet.

### Wallet not connected state

If no wallet is connected, show a message prompting the user to connect their wallet.


## Note Detail Page

**Route:** `/notes/:noteId`

A detailed view of a single note. Accessible by anyone (not just the owner), because delegation chains are transparent.

### Header
- Note ID
- Amount and token info
- Active/inactive status
- Root owner (original depositor)
- Current leaf owner
- Created timestamp

### Delegation Chain

The core visualization. Shows the full delegation chain from root to leaf, obtained via `getDelegationChain` (ordered by position, 0 = root). Display as a vertical chain/timeline:

```
[Root] Alice (0x123...)     — deposited 10 ETH
  ↓
[Delegate] Bob (0x456...)   — delegated 7 ETH
  ↓
[Leaf] Charlie (0x789...)   — current controller
```

Each link shows the address (and ENS name if resolvable) with a copy button and "view on explorer" link, plus the timestamp of delegation.

### Actions

Only shown to relevant users:

- **Delegate** (shown to the current leaf owner): address + amount fields. Calls `delegateNote`.
- **Revoke** (shown to any chain member who is not the leaf): calls `revokeNote`. The UI should make it clear that revoking will truncate the chain at the revoker's position, removing all delegations below them.
- **Reclaim** (shown only to the root owner, and only when the note is undelegated — root = leaf): calls `reclaimFunds`.
- **Spend on Project** (shown to the current leaf owner): see "Spending" section below.

### Note History

If we have event data from the indexer (via `delegation_note_events` table), show a timeline of all events for this note: created, delegated, split, revoked, purchased, etc. This gives a complete audit trail.


## Deposit Page

**Route:** `/notes/new`

A form for creating a new delegatable note.

### Fields
- **Amount** (ETH input — for the MVP, only ETH deposits are supported since that's what the contract primarily handles)
- **Delegate to** (optional) — an address field. If provided, after depositing, the UI automatically calls `delegateNote` to delegate the new note to this address. This saves the common two-step flow of "deposit then delegate."

### On submit
1. Call `depositETH` with the specified amount.
2. If a delegate address was specified, call `delegateNote` with the returned noteId.
3. Show success with a link to the new note's detail page.

### Why deposit?

A brief explainer for new users: "Depositing creates a delegatable note — a pool of funds that you or a trusted delegate can use to fund aligned projects. You can delegate decision-making to someone you trust, or browse projects yourself."


## Spending (on the Note Detail Page)

The leaf owner of a note can spend it to purchase tokens from a lazyGiving project's primary market. This is a section on the Note Detail page.

### Purchase Form
- **Project** — a project selector (search/browse from the list of active lazyGiving projects)
- **Token type** — which of the project's token types to buy (dropdown, populated after selecting a project)
- **Quantity** — how many tokens to buy
- **Cost** — computed from quantity * price (read-only display)

The cost must not exceed the note's amount. If the cost is less than the note's full amount, this is a partial spend — the original payment note's amount decreases and keeps the same delegation chain.

Calls `purchaseFromPrimaryMarketWithNotes`. Delegated-note purchases buy one ERC1155 token type per transaction. The UI needs to construct `purchaseShares`; for a single selected note, `shares` equals the purchased quantity. The chain array inside each share comes from `getDelegationChain` (but reversed: the SDK expects leaf-first, root-last, while the indexer returns root-first).

After a successful purchase, refresh the page to show the updated note state (the original note's amount will have decreased or the note will be consumed, and new ERC1155-holding notes will exist).

### Refund Action (for receipt notes of failed projects)

A note that holds ERC1155 receipt tokens (created by a purchase) can be refunded **once its assurance contract has failed**. On a receipt note whose project has failed, surface a "Refund into a note" action that calls `refundNote` (`refundIntoNote` on-chain). This consumes the receipt note and produces a new settlement-token note **rooted at the same delegation chain**, so revocability is preserved — the refunded funds return to the same pool/owner that funded the pledge, not to an EOA, and can then be reclaimed (by the root) or re-spent on another project. The whole note is refunded in one call. Only offer this when the project is in its failed state; otherwise the call reverts (`ConditionNotFailed`). After a successful refund, refresh to show the consumed receipt note and the new settlement-token note.


## Integration with LazyGiving (Project Detail Page)

Not a delegation page itself, but the delegation system adds information to lazyGiving's Project Detail page:

### Delegation Chains on Contributor Leaderboard

When a contribution was made via a delegatable note, the contributor leaderboard should show the full delegation chain rather than just a single address. For example: "Alice → Bob → Charlie" where Alice is the money provider, Bob delegated to Charlie, and Charlie made the purchase. This implements the transparency requirement from the delegation spec ("the site shows 'Alice has contributed 5% of this project's funds; the full delegation chain was Alice → Bob → Charlie'").

### "Fund with Delegated Note" option

In the "Buy Tokens" section, add an option to pay using a delegatable note instead of paying directly from the wallet. When selected, show a dropdown of the user's active notes (from `getNotesByOwner`) with their balances. This calls `purchaseFromPrimaryMarketWithNotes` instead of the direct buy function, and must restrict each note-funded transaction to one token type.

This is an alternative entry point to the spending flow described in the Note Detail page — it's the same action, just initiated from the project side rather than the note side.


## Note intent

`NoteIntent` (`hardhat/contracts/delegation/NoteIntent.sol`) lets an attester declare that a note is intended for a particular cause/statement. `DelegatableNotes` stays a pure financial primitive; intent is an optional layer on top.

The UI for this was removed once (commit `7fc1ba5c`) because the attestation authority and lifecycle-inheritance semantics were unresolved. Those questions are now settled. The rules below are normative for any restored UI; the outstanding implementation work is tracked in the root [TODO.md](/TODO.md).

### The rule

> A live fungible note counts for cause C when the latest attestation by that note's **root owner**, on that **exact note ID**, names C.

That is the whole rule. There is deliberately **no inheritance**.

### Why no inheritance

Intent inheritance looks cheap — every derivation event carries explicit parent→child linkage (`NoteDelegated`, `ChainSplit`, `RefundedIntoNote`, `ReimbursementClaimedIntoNote`, `ERC1155Purchased`) — but "nearest ancestor attestation" has no coherent meaning over time.

Consider note 1 (100, cause A) partially split into a remainder (note 1, 60) and a child (note 2, 40). If the root later retargets note 1 to cause B, it is genuinely ambiguous whether that changes only the live remainder or retroactively changes note 2 as well, because note 1's ID is simultaneously a live note and a historical ancestor. Under "nearest current ancestor" the root cannot retag only the remainder. Snapshot-at-derivation-time resolves the ambiguity but is a heavier rule requiring inherited state stored at each derivation.

Inheritance also buys much less than it appears to, because note IDs survive the two operations that matter most:

- **Full delegation** keeps the same note ID (`DelegatableNotes.sol:485`), so intent survives for free.
- **Revoke** only truncates the delegation chain; the note ID is unchanged, so intent survives for free.

What starts untagged, and must be tagged explicitly by the root if they care: partial-split children, purchase outputs, refund outputs, and reimbursement outputs.

### Consequences

| Operation | Effect on intent |
|---|---|
| Full delegation | Survives (same note ID) |
| Revoke | Survives (same note ID) |
| Partial split | Remainder keeps intent at its reduced amount; the new child is untagged |
| Partial purchase | Input remainder keeps intent at its reduced amount |
| Purchase / refund / reimbursement output | Untagged |
| `FundsReclaimed` | Note leaves the live set |
| `NoteConsumed` | Amount reduces; the note leaves the live set only when `deleted == true` |

### Validity filters

An attestation counts only when all of these hold. `NoteIntent` itself validates none of them — it does not check that the note contract or note ID exists — so these are read-side obligations.

- The note contract is a configured `DelegatableNotes` deployment.
- The note exists, and the attestation is not earlier than the note's **birth event**. Birth is `NoteCreated` for deposits and recurring pledges, but partial-split children are born in `ChainSplit` and have no `NoteCreated` at all (`DelegatableNotes.sol:487`), so the fold must track a real birth block/log-index cursor.
- `attester == rootOwner`.
- The note is active and fungible.

### Root ownership

Root ownership is immutable at the contract level — there is no transfer-root operation. It must be an explicit `rootOwner` field on the folded note state, seeded at birth and copied through derivations, **not** recomputed as `chain[0]` on each read.

`NoteCreated.owner` is the true root only for deposits and recurring pledges. For purchase, refund, and reimbursement outputs the emitted owner is the current *leaf* (`DelegatableNotes.sol:891`, `:719`), and split children emit no `NoteCreated`. The fold invariant:

- Deposit / recurring-pledge note: seed `rootOwner` from `NoteCreated.owner`. Under `createDelegatedNoteFor` the emitted owner is the pledger who actually supplies the funds via `transferFrom`; the recurring-pledge registry is only the caller, never the root.
- Split child: copy `rootOwner` from the original.
- Purchase / refund / reimbursement output: copy `rootOwner` from the linked input.
- Delegate / revoke / consume: never change it.
- Assert `chain[0] == rootOwner` after every event.

This is lineage reconstruction, which the fold needs anyway. It is not intent propagation.

### Display

The number is soft: a root owner can `reclaimFunds`, `revoke`, or retarget their attestation at any moment. It must never be presented as committed or guaranteed funding.

- Show **"N supporters have earmarked X"**, carrying the supporter count as prominently as the amount. A count of distinct supporters is a far more robust signal of interest than a revocable sum.
- Supporter count is **unique root-owner addresses** — not notes and not attestations, or a single supporter splitting a note would inflate it.
- Group amounts **per currency, by chain and token address**. Never sum unlike assets into one figure.
- Count only the native token and configured settlement ERC-20s. Otherwise anyone can deposit a worthless ERC-20 and manufacture an impressive-looking amount.
- Exclude ERC-1155 receipt notes entirely (`tokenType === 1`): their `amount` is a receipt quantity, not currency value.
- Optionally break down direct (root still holds it) versus delegated (a delegate can spend it without the supporter acting again), which mean different things to a project creator.

### Write surfaces

- An optional cause picker on one-time deposit, reusing the statement picker the deposit page already loads for recurring pledges (`ui/src/delegation/pages/DepositPage.tsx`).
- A current-earmark display plus a change/clear action on the detail page of an active fungible note.
- Offer the write action **only to the root owner**. Delegation does not move this authority. Do not offer it for receipt notes — the permissionless contract will still accept such an attestation from an external caller, but the UI and the aggregate ignore it.
- Sequential transactions are acceptable; be explicit about partial success, since a succeeding deposit with a rejected attestation simply leaves the note untagged.

### Clearing an earmark

`NoteIntent.attestNoteIntent` rejects `bytes32(0)` (`NoteIntent.sol:43`), so intent can currently only be *retargeted*, never withdrawn. That is a real gap: a supporter who changes their mind cannot remove a claim without relocating the false signal to some other cause.

The contract is dormant and not on mainnet, so the agreed fix is to **allow `bytes32(0)` to mean "cleared"**, emitting the same last-write-wins event. The SDK decoder must then preserve zero as "no intent" rather than converting it to a synthetic CID (`sdk/src/utils/eventDecoder.ts` currently calls `bytes32ToCid` unconditionally). A reserved sentinel statement is a strictly worse fallback — it is magic protocol data every reader must special-case forever — and would be a temporary compatibility measure, not the design.

### Querying and scale

`intendedStatementId` is not indexed on-chain; all three indexed slots are spent on attester, note contract, and note ID. Cause→notes is therefore a reverse query that requires downloading all NoteIntent events and filtering locally.

Two known bugs must be fixed before any aggregate is trustworthy:

- `getNoteIntentAttestationsByStatement` filters by statement **before** folding (`sdk/src/subsystems/delegation/queries.ts`). A note retargeted from A to B still appears under A. Fold all latest attestations first, then filter by cause.
- The removed UI called `getNote` once per matching attestation, and each call downloads and folds every delegation event globally. That shape must not return; use a single aggregate fold instead.

On completeness: the event API defaults to a 1000-row limit and caps at 10,000, with no cursor pagination (`indexer/src/api/index.ts`). Because it returns the *newest* rows, once any event type exceeds the cap, older events silently disappear and the fold becomes incomplete — and since anyone can attest on any note ID, spam can push legitimate attestations out of the window. Rule-1 filtering happens after fetching, so it does not protect the window.

The cheap mitigation needs no contract change and no server view: the API already accepts `blockNumber_gte`/`blockNumber_lte`, so fetch from the deployment block and recursively bisect any range that returns exactly the cap, then cache the folded result. This makes fetching complete, but clients still download every attestation. Reassess against measured event volume before this becomes a prominent production signal; if abuse makes global downloads material, index the cause in a new contract/event version or add a derived server-side view.

Do not ship a creator-facing number that silently reflects only the newest 10,000 events.

### Explicitly deferred

Intent inheritance of any kind; receipt-note tagging; automatic tagging of split, refund, or reimbursement outputs; atomic transaction batching of deposit + attestation; server-side materialized cause views; and any headline total or ranking of causes by earmarked money.


## Navigation

The Delegation domain's AppShell navigation should link to the delegated-fund pages (`/notes`, `/notes/new`). Other domains should link across to Delegation when they need donor-delegate setup, note detail, or delegate track-record views instead of mounting these pages locally.


## What's NOT in the Delegation UI

- **Commission for trustees** — explicitly deferred from MVP per the delegation spec.
- **Merging notes** — mentioned in the spec as a possibility but not implemented in the contract. Don't build UI for it.
- **ERC20 token deposits** — the contract supports it but the MVP focuses on ETH. Can add later.
- **Retroactive reimbursement through notes UI** — the contracts and SDK can claim a receipt note's available reimbursement into a settlement-token note under the same delegation chain, but the note-detail UI still needs to expose that action and available amount.
- **Cross-cause leaderboards** — that's the Aligning UI's job.
- **Multi-note spending** — the contract supports spending from multiple notes in one transaction, but for the MVP the UI can start with single-note spending. Multi-note spending can be added later as a "use multiple notes" option if needed.


## Contract Addresses

Read from environment variables, following the existing pattern:
- `VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS`
