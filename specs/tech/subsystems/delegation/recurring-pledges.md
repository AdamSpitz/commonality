# Recurring pledges (mechanics)

How standing-order pledges work at the contract/SDK level. Product view: [specs/product/recurring-pledges.md](/specs/product/recurring-pledges.md).

Confirmed not yet implemented anywhere (contracts, SDK, specs). The design goal: a user sets up "create a $X note for cause C every month, delegated to Alice" once, and it recurs hands-off with a public, foldable record of ongoing $/month per cause.

## MVP decisions (locked)

These were the open design questions; resolved for the MVP build:

1. **Contract shape — registry-gated.** A new `RecurringPledges` registry holds the intent records and exposes a permissionless `executeDue(pledgeId)`. The actual note minting is a new function on `DelegatableNotes` (e.g. `createDelegatedNoteFor(...)`) that is **restricted to the registry as caller**, not permissionless. Rationale below under "the rooting subtlety": the user grants a standing ERC-20 allowance up front, and only the registry-gated path can guarantee that allowance can ever be spent *only* on a note matching the recorded pledge (same amount, token, cause, delegate). A directly-callable mint would let a griefer move a user's pre-approved allowance into a note delegated to an arbitrary address — bounded harm (the user is still root and can revoke/reclaim, no funds stolen) but a sharp edge we avoid. `executeDue` itself stays permissionless so anyone can poke a missed run.
2. **Token scope — ERC-20 only.** Auto-pull is built on ERC-20 `transferFrom`, so MVP rejects any non-ERC-20 token (including native ETH) at pledge setup. ETH is deferred to the later pre-funded escrow option (its natural home), per the caveats below. No WETH wrapping in MVP.
3. **Scheduler — its own logical service.** The offchain runner is a new, deliberately tiny **logical service** hosted by `service-host` (see [service-bundling](../../service-bundling.md)), alongside the existing attester/finder/nudger services — *not* folded into an existing service's loop, and not a separate physical deployment. It gets its own config object and (where needed) its own signer key, but bundles into the same physical process at deploy time, so adding it costs little operational complexity. It is stateless: each tick it asks the SDK for due pledges and calls `executeDue` on them. Because `executeDue` is permissionless and time-gated, a missed tick is self-healing (anyone can poke; catch-up capped at one period per call), so the runner needs no durable state or trusted-key guarantees.

## Two pieces

### 1. Standing-pledge intent record (public, foldable)
A registry that records the pledge and emits events the indexer can fold, mirroring the existing [client-side-folding](../../indexer/README.md) pattern. Conceptually each record holds:

- `rootOwner` (the pledger), `delegateTo` (e.g. Alice), `token`, `amountPerPeriod`, `period`, `causeRef` (statement/cause the note targets), `backingType`, `lastExecuted`, `active`.
- Events: `StandingPledgeCreated`, `StandingPledgeExecuted`, `StandingPledgeCancelled`. The SDK folds these into per-cause "ongoing $/month" totals and per-user active-pledge lists.

The softest execution path (reminder-to-sign) needs *only* this record — it could even be a self-attestation rather than a contract, idiomatic to the codebase (cf. location self-attestations). The hands-off path needs the record **plus** the executor below.

### 2. Hands-off executor — and the rooting subtlety

The obvious "just call `deposit` then `delegate` on a schedule" does **not** work for an automated agent, because of two existing facts in `DelegatableNotes`:

- `deposit()` roots the new note at `_msgSender()` — so if an executor calls it, the executor becomes root, not the user. The user would lose root-level reclaim/revoke authority over each month's note, breaking the delegation system's revocability guarantee.
- `delegate()` requires the caller to be in the note's chain — so the executor can't delegate a user-rooted note to Alice either.

Workarounds that keep the user as root:

- **(chosen) one new additive entry point** — a new `createDelegatedNoteFor(...)` function on `DelegatableNotes`, **callable only by the `RecurringPledges` registry** (see MVP decision 1): it pulls `amountPerPeriod` from `rootOwner` via ERC-20 allowance (`transferFrom`), then **atomically creates a note with chain `[rootOwner, delegateTo]`** — rooted at the user, already delegated to Alice, in one call. The parameters come entirely from the recorded standing pledge, so the call can only ever produce exactly what the user authorized.
- This is **additive** — it introduces a new function and touches no existing function or its semantics. (It is *not* literally "zero contract changes," contrary to the initial hope; the rooting requirement forces a small addition. The soft reminder path remains zero-change.)

**Execution trigger.** The registry's `executeDue(pledgeId)` is **permissionless**, guarded by `block.timestamp >= lastExecuted + period` and a sufficient allowance/balance; it is the only caller of the registry-gated `createDelegatedNoteFor`. Then:

- Our **offchain scheduler** calls it each period (the expected normal path — offchain is fine).
- If our runner is down, **anyone** (a keeper like Gelato/Chainlink, or even Alice) can poke it, so a missed run doesn't silently drop the pledge. No trusted executor key required.

**Opt-out / no lock-up.** Funds stay in the user's wallet; only an allowance is granted, so a standing pledge is a revocable authorization, not escrow. Opt out = cancel the pledge (`active = false`) or zero the allowance; either makes future executions revert/no-op.

### Backing strength
`backingType` on the record distinguishes auto-pull (allowance + balance verified) from soft/reminder intent. Display and any credible-threat math should weight these differently (see product spec). For auto-pull the SDK can additionally surface "currently fundable?" by checking live allowance/balance against `amountPerPeriod`.

## Caveats

- **Native ETH.** Pull-based recurring needs an allowance, which ETH doesn't support. ETH pledges must either use WETH (so `transferFrom` works) or fall back to the pre-funded escrow option. Stablecoin/ERC-20 pledges are the clean case.
- **Allowance drift.** Allowance or balance can fall below `amountPerPeriod` between periods; a due execution simply reverts/skips and the UI flags the pledge as lapsed rather than treating it as committed.
- **Period accounting.** Use `lastExecuted + period` (catch-up at most one period per call) rather than wall-clock months; keep it simple and avoid minting multiple back-dated notes if execution is late.

## Optional firmer/softer executors (later)

- **Pre-funded escrow**: deposit N periods up front into a contract that releases one note per period. Firmest commitment, locks capital, and is the natural ETH-without-WETH path. Same intent record.
- **Reminder-to-sign**: offchain notification with a prepared tx. Zero contract changes, weakest commitment, requires monthly user action — a soft fallback, never the default.

## SDK work

- Fold `StandingPledge*` events into per-cause monthly totals and per-user pledge lists (new fold alongside `foldDelegationState`).
- Actions: `createStandingPledge`, `cancelStandingPledge`, and a helper the scheduler uses to find/execute due pledges.
- A "fundable now?" query that checks live allowance/balance for auto-pull pledges.
