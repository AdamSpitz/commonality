# Statements, attestations, and hosted speech

## Current posture (Jul 2026)

Primary publication is materially improved: new user-authored displayable text is signed and published by the author through `PublishedData`, and LazyGiving no longer ingests image bytes. Author retraction and runtime CID suppression exist. See [statement-hosting.md](statement-hosting.md) and [ADR 0004](/specs/decisions/0004-user-publishes-displayable-data.md).

That does **not** remove Commonality's distributor/editor roles. Operated UIs and APIs re-serve and aggregate third-party content; our attesters, nudgers, bridge creator, defaults, and curated verticals are our own speech. The remaining legal work is therefore operational: a monitored notice/takedown process, configured production denylist, suppression from both rendering and aggregates, unpinning of anything we pin, clear automated-opinion methodology, and counsel-reviewed content rules. Canada still lacks a general US-style Section 230 shield.

Original worries, from the early notes:

- "Here are some projects that have been attested to be aligned with this cause." What if the attestations are malicious/misleading? People might be tricked into donating to bad projects.
- "Here's a project you can donate to or invest in." What if the project is a scam? Now our site is showing scams. What if the project is for a Bad purpose? Now our site is helping fund Bad stuff. (The Bad-purpose case also has a sanctions edge — see [sanctions.md](sanctions.md).)

The early notes assumed the conceptspace stuff (IPFS statement-storage, Beliefs and Implications contracts, the conceptspace UI) was fine — no finance involved. That's *not* as risk-free as it looked, because Adam is Canadian. The US Section 230 shield for user content has no Canadian equivalent — Canadian platform operators can face defamation exposure for third-party content after notice, and Canada has criminal hate-propaganda provisions plus the evolving online-harms regime. Statements were originally pinned on IPFS and are now author-published through `PublishedData`, but our sites still choose what to display, and our AI attesters *generate* content ("this project is aligned with this cause," civility judgments about named creators' content).

(Correction to an earlier version of this analysis, which worried that "a low civility score arguably disparages a named creator": per the [noninflammatory-content spec](/specs/tech/subsystems/content-funding/noninflammatory-content/README.md), only sufficiently-confident **positive** decisions are published as on-chain attestations — a creator who fails the criteria gets silence, not a published low score. That substantially softens the disparagement exposure. The residual risks are the positive attestations' IPFS-stored explanations, and any service API surface that exposes negative judgments off-chain.)

**What to do:** operate notice-and-takedown for displayed content; frame attester outputs explicitly as automated opinions with disclosed methodology; register a DMCA agent for the US side; and make authorship/curation attribution explicit. Do not claim the operated sites are neutral protocol surfaces: the contracts may be protocol-shaped, but each UI and editorial agent is an operated, opinionated service.

Note: this is one of the risks the community-run-UI model genuinely helps with — display exposure attaches to whoever chooses what to display. See [operator-posture.md](operator-posture.md).
