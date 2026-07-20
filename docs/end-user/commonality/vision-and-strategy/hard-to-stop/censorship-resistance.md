# Censorship resistance

Because the system's core runs on smart contracts rather than through any centralized organization, the parts that matter most have no chokepoints for a hostile actor to attack:
  - No bank accounts to freeze (funds live in smart contracts, not custodial accounts).
  - No treasury to seize (funding is per-project, not pooled in one place).
  - No organization to target (there's no "Commonality Inc." holding the system hostage — the contracts run without us).
  - No leadership to arrest or coerce into flipping a switch (the contracts have no switch; delegation is person-to-person across many individuals).
  - No single record to erase (beliefs are on-chain transactions and statements are published on-chain by their own authors, so they persist independently of us).

That's the strong, literally-true core. Two honest qualifications matter, because an overclaimed story is easy to poke a hole in:

## The frontend is *mirrorable*, not (yet) *unstoppable*

The website you use to reach the system is a different thing from the system itself. Today the default front door people actually use is served through infrastructure we operate (conventional hosting / a CDN), so *that path* has chokepoints like any website. What makes it resilient is not the default path but the shape underneath it:

- The UI is published as a **content-addressed build** (an IPFS CID): a fixed, verifiable artifact anyone can re-host. If our front door goes down, others can serve the identical, tamper-evident build.
- It's reachable under a **self-sovereign name** (ENS, e.g. via `eth.limo`) that no registrar or court can seize, resolvable in an ordinary browser with no extension.

So the accurate claim is: **if we're taken down, the identical UI stays reachable under a name no one can seize, and anyone can re-serve it** — the frontend can't be permanently silenced even though its default path isn't itself unstoppable. That's a "can't be erased," not a "can't be pressured."

## We deliberately keep the ability to moderate what *we* display

The contracts are neutral and unstoppable on purpose. The front door we operate is *not* claimed to be — we retain the ability to refuse to display or route to genuinely illegal content, and we exercise it. That combination (neutral protocol + a moderated front-end we own) is deliberate and lawful; it's what lets the un-erasable core coexist with responsible operation. The immutability that's a feature lives at the contract layer; at the display layer, retained control is the feature. (See the operator-posture and statement-hosting analysis in the legal specs for why this split is the right one.)

("Doesn't the un-erasable core mean it'll also be used for evil?" Sometimes, yes. See [ethics.md](../ethics.md).)
