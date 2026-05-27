# Alignment anti-abuse: project credentials and trust-graph ergonomics

Alignment's only structural defense against spam, sabotage, and bad-faith vouching is the trust graph: if a voucher isn't in your network, their vouches don't appear on your portals. That defense is real but incomplete. This doc collects ideas for strengthening it along two axes:

1. **Project-side credentials** — letting projects display verifiable bona fides so users can judge them with less reliance on the trust graph.
2. **Trust-graph ergonomics** — making the trust graph easier to bootstrap and maintain so it actually gets curated.

Plus a couple of cross-cutting mechanisms.

The current ordering reflects a guess at priority, not a roadmap. Nothing here is committed.

---

## 1. Project-side credentials (verifiable bona fides)

The goal: raise the cost of fake / low-effort projects, and give honest projects a way to stand out without relying on a vouch from someone the viewer already trusts.

### Link-verified identities
Twitter, GitHub, ENS, DNS-TXT domain ownership, SIWE-signed addresses. Display as badges on the project page. Each is cheap, none is conclusive, but stacked they raise the cost of fakes significantly.

### Proof-of-personhood for project creators
Gate "create project" behind World ID / BrightID / Gitcoin Passport. Privacy-preserving, no KYC, kills the cheapest sybil attack (one human posting 50 spam projects). Probably the highest-leverage single change available. See [here](/specs/tech/shared/unique-human-id.md).

### On-chain track record
Show address age, prior LazyGiving projects (and whether they delivered), prior retroactive-funding payouts, prior funded content. The data already exists; this is primarily a UI surfacing job.

### Third-party attestations as credentials
Use the existing attestation infrastructure for non-vouch claims:

- "Acme Audit Co. attests this project's books were reviewed Q1 2026."
- "Charity Navigator attests this is a registered 501(c)(3)."
- "Local journalism review attests this newsroom existed before 2020."

Same trust-graph filter applies — you only see audit attesters you trust. This generalizes the vouch infrastructure rather than building something new.

### Stake-to-post
Project creators bond a small amount to list a project. Slashable by a challenge process (optimistic, Kleros-style, or by trust-graph majority). Refundable on successful campaigns. Filters out cheap spam without filtering out poor creators if the bond is small enough.

### Reciprocal attester lists
A project can publish "I agree to be evaluated by these attesters." Lets serious projects opt into stricter scrutiny as a signal of confidence.

---

## 2. Trust-graph ergonomics

The goal: most users will never enjoy curating a trust list. The system should still produce useful portals for them.

### Seeded defaults per cause area
Ship a small starter set ("here are 5 people known for climate vouches — adopt this list to bootstrap, then prune"). Solves the empty-portal problem on day one. The seed lists themselves are vouched objects — curated, contestable, replaceable.

### Import from existing graphs
Farcaster follows, GitHub stars, ENS social records, the user's existing delegation list on LazyGiving. Even a noisy import is better than blank.

### Implicit trust from the user's own actions
If a user funded projects via someone's delegation, weight their vouches up automatically. If a user signed statements by someone, ditto. The user already trusts these people; the system can infer it without asking.

### Domain-scoped trust
"I trust X for climate, not for journalism." Falls naturally out of the cause structure — trust attached to a statement (or its implication subgraph) rather than globally. Reduces the cost of trusting a domain expert who is unhinged outside their domain.

### One-click "this is noise"
Negative signals propagate too. Most users will never positively curate a trust list, but they'll happily hit a "hide" button when junk shows up. Use that signal — and propagate it through the network the same way positive trust propagates.

### Discovery slider on the portal
A control that loosens the trust filter: "only my network" → "my network + 1 hop" → "anyone." Surfaces new vouchers the user might want to add to their network. Turns trust-graph maintenance into a passive byproduct of browsing instead of a chore.

---

## 3. Cross-cutting mechanisms

### Retroactive reputation damage
When a project turns out to be fraudulent, the bad outcome flows back to every voucher's public profile. Doesn't prevent the first incident, but makes the second one cost real reputation. Pairs naturally with the existing on-chain attestation history.

### Vouch decay
Old vouches lose weight unless refreshed. Cheap defense against an attacker who builds reputation, then sells or weaponizes it years later. Also gracefully handles vouchers who go inactive.

---

## Suggested first moves

If picking what to build first:

1. **Proof-of-personhood for project creation.** Concrete integration work, directly attacks the spam vector, no new social mechanisms to design.
2. **On-chain track record surfaced on project pages.** Uses data the system already has; pure UI work; immediate signal lift.

These two attack the cheapest abuse vectors with the least design overhead. The trust-graph improvements are higher-leverage but more design-heavy — worth tackling after observing what abuse patterns actually emerge in practice.

---

## Related

- [end-user/alignment/how-alignment-works.md](../../docs/end-user/alignment/how-alignment-works.md) — the user-facing "where abuse comes in" section that this spec backs.
- [end-user/shared/key-ideas/trust-networks.md](../../docs/end-user/shared/key-ideas/trust-networks.md) — the trust-graph mechanism this is layered on.
- [nudger-immune-system.md](nudger-immune-system.md) — analogous anti-abuse thinking for the nudger surface.
