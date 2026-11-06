# Milestones

The ladder of major milestones, in order. Keep this file current: when a milestone closes, mark it done and move its leftovers forward. Detailed work stays in the plans linked from each row; this file is the index, not a to-do list.

This is the **product** ladder. The verifier's `verifier/milestone.json` (`ordinary-development → release-candidate → full-launch`) is a separate ladder for check thoroughness.

Last triaged: 2026-11-06.

## 1. Testnet works at all (two-person shared lab)

**Status: basically done.** All ten items in [testnet-working-plan.md](./testnet-working-plan.md) are checked.

Leftovers (mostly Adam's clicks; see [inbox.md](../inbox.md) and [testnet-prep.md](../testnet-prep.md)):

- Cloudflare zone / DNSLink and the `services.testnet.commonality.works` gateway.
- Alignment-trust bootstrap wallet, Render secret, and denylist canary.
- Redeploy v0.6 gas-tank faces to Base Sepolia, then the sponsored-gas live walk with a Base Account ([wallet-without-privy-plan.md](../specs/tech/wallet-without-privy-plan.md), [sponsored-gas-live-trace.md](./sponsored-gas-live-trace.md)).
- Testnet redeploys waiting on landed code: `NoteIntent`; `ContentRegistry` / `ProjectFactory` / `CreatorAssuranceContractFactory` for work items ([TODO.md](../TODO.md)).
- Nightly `verifier:deep-cadence` exits red because the local destructive stack fails first ([TODO.md](../TODO.md)).

## 2. Big fake-data simulations on testnet

**Status: mostly done.** v1 ran 10 → 25 → 100 users on Base Sepolia and reconciled 1932/1932. v2 ran and reconciled locally.

Leftover: v2 step 14 (funding beyond the fixed purchase unit) is paused at 392/1508 on testnet. Resume instructions are in [TESTNET-SIMULATION-PLAN.md](../fake-data-generation/TESTNET-SIMULATION-PLAN.md) and the TODO.md item that points at the continuity handoff.

1000+ user stress runs stay local ([fake-data PLAN.md](../fake-data-generation/PLAN.md) job D).

## 3. Ready for outside review / real groups

**Status: not yet defined.** Adam should decide what "credible enough to show a real group" means. Candidate items already filed:

- Demo-seed live UI pass and local public-goods coverage (A5/E2), so the non-political story is visible ([fake-data PLAN.md](../fake-data-generation/PLAN.md) item 4, [TODO.md](../TODO.md)).
- Rewrite [product ui-domains.md](../specs/product/ui-domains.md) for the founder-first Commonality site ([TODO.md](../TODO.md)).
- Landing-copy positioning findings ([inbox.md](../inbox.md)).
- Talking to real groups about what the real version would look like ([inbox.md](../inbox.md)).

## 4. Mainnet-ready

**Status: not started.** Known blockers, consolidated here from TODO.md and inbox.md:

- Gas-tank accounting: `CreatorGasTank` can be oversubscribed within one bundle ([TODO.md](../TODO.md)).
- Gas-tank enrollment squatting, unauthenticated account implementations, and the Sybil abuse budget ([TODO.md](../TODO.md)).
- 2-of-3 Safe for the contract-admin role, and the governance work it unblocks ([security-recoverability.md](./security-recoverability.md)).
- Scoped-down external tokens (Cloudflare, Render, Pinata) and an OpenRouter spend limit ([inbox.md](../inbox.md)).
- Beat-memory compliance with X's restricted-use rules, if beat agents ship ([TODO.md](../TODO.md)).
- Decide when to do the Hardhat 2→3 migration, as a standalone project rather than a dependency bump.
- Archive-RPC availability risk from pointers-only storage ([inbox.md](../inbox.md), storage/chain follow-ons).
