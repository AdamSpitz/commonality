# Trust config is chain-scoped

Every "trusted source" setting in Commonality — implication attesters, content
attesters, beat agents, nudgers — is a **wallet address**, and an address only
means something relative to the chain you are reading. The same address that
publishes hundreds of attestations on Base Sepolia has published nothing on a
local hardhat chain, because it is a different chain.

That makes an entire class of config bug invisible: the UI is working
correctly, the address is well-formed, the trust filter is applied faithfully,
and the result is a perfectly ordinary **zero**.

## The incident this doc exists because of

A 2026-07-25 product walk of the live UI concluded that Tally's headline promise
— "counted alongside everyone who agrees, even in completely different words" —
"reads as zero on first contact", and that the official statement-connection AI
was undeployed. It was filed as the single widest product gap in the pass.

It was a config bug. Specifically:

- The default-trust mechanism already existed
  (`ui/src/shared/hooks/useTrustedAttesters.ts` falls back to
  `VITE_DEFAULT_TRUSTED_ATTESTERS`), and `scripts/generate-wallets.mjs`
  populates it automatically.
- The official attester *was* deployed, and `scripts/deploy-ui.sh` bakes its
  address into testnet builds via `setup-env.sh base-sepolia`.
- But `ui/e2e/global-setup.ts` rewrites `ui/.env` in place to repoint the UI at
  the local hardhat chain — and it rewrote the chain id, RPC URL and every
  contract address while leaving the **trust roots** untouched. The result was a
  file whose header said `base-sepolia`, whose body pointed at chain 31337, and
  which trusted a Base Sepolia attester that had published nothing locally.
- Two pieces of stale hand-written UI copy ("The official Commonality
  statement-connection AI is not yet deployed") corroborated the wrong
  conclusion.

Cost: a product decision was queued for Adam ("do we deploy an official attester
and ship it as a default, and is that compatible with our neutrality story?")
where the first half was already shipped.

## Why you cannot fix this with a better default

The obvious repair — put the right addresses in `deployments/localhost.env` — does
not work, and would have recreated the same bug in a new place. Seeded local
implications are **not** published by the attester service. They are published by
simulation user accounts (`fake-data-generation/runSimulation.ts`, the
`attestImplication` case), whose keys are generated per run once you get past the
well-known hardhat accounts. A verification run against a freshly seeded chain
showed the attesting address as `0xed1134…`, which matches no static default
anywhere in the repo.

So local trust roots are **not statically knowable**. `global-setup.ts` now
clears them when it repoints the UI at the local chain, and the UI discovers what
is actually active by reading the chain.

## What now prevents recurrence

- **`getImplicationSourceActivity`** (`sdk/src/subsystems/conceptspace/queries.ts`)
  reports which attesters have actually published on the chain being read, and
  which of your trusted sources have not.
- **`useImplicationSourceActivity`** (`ui/src/shared/hooks/`) classifies a zero
  into `no-sources-configured`, `misconfigured` (edges exist, none from a source
  you trust — the bug above), `no-implications-on-chain`, or `healthy`. When the
  chain cannot be read it reports `unknown` and says nothing, rather than
  replacing a stale claim with a fresh unfounded one.
- **The statement page** explains a zero instead of just printing it, and **the
  trusted-sources settings page** shows per-source publication counts, labels
  addresses that are shipped defaults rather than user choices, and offers
  one-click trust for sources that are demonstrably active here.
- **`ui/e2e/global-setup.ts`** clears `VITE_DEFAULT_TRUSTED_*` whenever it
  rewrites chain identity, so a cross-chain mixture cannot be left on disk.
- **`testnet.app-config`** now asserts trust-root *liveness*: every address in
  the keys listed under `expectedConfig.trustRootKeys` (currently
  `VITE_DEFAULT_TRUSTED_ATTESTERS`) must appear in the deployed bundle **and**
  have at least one `ImplicationAttestation` on the configured chain. Addresses
  are read from the deployment env file rather than hardcoded, so a redeploy
  cannot leave the check asserting stale values. A trust-root query that cannot
  run is reported but does not fail the check — an unreachable event cache is
  the indexer checks' business, and failing here would misattribute it.

## Settled: shipping a default is compatible with the neutrality story

Commonality ships a default trusted implication attester on testnet, even though
the product tells users "you choose whom to trust" and "anyone can run their
own". Adam ruled on 2026-07-27 that this is fine **given the disclosure**: the
default is not silent. It appears in the trusted-sources list like any other
entry, tagged `Shipped default` so the user can see they did not choose it, and
it is removable with one click. Do not make the default invisible again — the
tag is what makes the neutrality claim honest.

## Rules for anyone touching this area

1. **Never write UI copy that asserts a deployment state.** "The official X is
   not yet deployed" is a claim with a shelf life. Derive it from the chain or
   do not say it.
2. **If you rewrite chain identity in an env file, rewrite the trust roots too.**
   They are chain-scoped; carrying them across networks produces config that
   looks valid and behaves as absence.
3. **A zero from a filtered aggregate needs a reason.** Anywhere a count is
   filtered by trusted source, an empty result must be able to say whether the
   filter or the data was empty.
4. **`security.trust-roots` will not catch this; `testnet.app-config` will.**
   The former guards trusted addresses against a recorded baseline, so a value
   that is wrong for the chain but has not *changed* passes. Chain-liveness is a
   separate property, checked by the latter. If you add a new kind of trusted
   source (content attesters, beat agents, nudgers), add its env key to
   `expectedConfig.trustRootKeys` in `verifier/environments/testnet.json` —
   liveness is currently asserted for implication attesters only, because that
   is the only source whose publications are a single indexed event type.
