# 0023. Do not gaslessly sponsor a statement family's long tail

- **Status:** Accepted
- **Date:** 2026-11-05
- **Related specs:** [`specs/tech/subsystems/conceptspace/statement-families.md`](../tech/subsystems/conceptspace/statement-families.md), [`specs/tech/sponsored-gas.md`](../tech/sponsored-gas.md), [`specs/decisions/0022-statement-families.md`](./0022-statement-families.md), [`hardhat/contracts/sponsored-gas/StatementGasTank.sol`](/hardhat/contracts/sponsored-gas/StatementGasTank.sol)

## Context

[ADR 0022](./0022-statement-families.md) already rejected sponsoring *publication* of every family member. This decision is about the other temptation: sponsoring *signatures* (`Beliefs.setBelief`) for every statement a family can generate, without writing one `enroll` per member.

`StatementGasTank.enroll` stores a statement id. It does not require the bytes to be published. The id is the hash of the canonical statement document, so a sponsor can compute it locally. That does not make bulk enrollment cheap. `enrollMany` is the same write, repeated; the contract says to chunk large sets because each id is a cold storage write. A family that can grow to millions of statements is not something to pre-enroll, and it is not something to pre-publish.

The product reason for the tank is narrow: an embedded-wallet signer who has no ETH can still sign a statement the sponsor has chosen to pay for. Anything that makes that signer pay a prover, a service, or the chain has lost that reason.

## Decision

Sponsor gas only for statement ids the sponsor is willing to enroll explicitly. For a generated family, that set is the small stable core (the bridge statements), not the long tail of combinations.

Long-tail signatures are unsponsored. The signer pays chain gas directly. Do not add a family-membership path to the tank.

## Alternatives considered

- **Enroll every member id.** Works for a couple thousand statements. Rejected as the plan for an open-ended family: the cost tracks the size of the catalog, not the number of real signatures, and the catalog is allowed to grow without a listing.
- **Merkle root of member ids.** Validation is a short path of hashes, and the contract stays a hash checker. Rejected because it still requires enumerating the family, off-chain, and freezing that set into a root. We do not want a step that lists every combination, even once.
- **Rebuild the paragraph in Solidity and treat the selection as the witness.** No enumeration. Rejected because the statement id is a hash of the exact bytes, and the joining rules are already subtle. A second implementation that must match the generator byte for byte will drift, and every drift is a signature the tank refuses.
- **Sponsor-run authorizer.** The sponsor expands the selection with the real generator and signs `(familyId, statementId, expiry)` on demand. The tank checks that signature. No enumeration, and the English stays in one program. Rejected as an open endpoint: a caller can force statement after statement. If the work is a zero-knowledge proof, each request is actually expensive. Reasonable only for callers the sponsor already knows, or who pay for the request. That is not gasless signing.
- **Caller-built zero-knowledge proof of the generator.** The caller proves "this enrolled program, on this selection, emitted bytes that hash to this statement id." The tank checks the proof and does not rerun the English. The generator is small enough that this is a contained engineering project, not a research problem: a zero-knowledge virtual machine over a byte-identical port, not a hand-written Noir circuit for variable-length prose. Rejected anyway. Proving is not practical as free browser work, so the signer pays a prover or runs one, and the tank still pays chain gas afterward. Paying the chain gas directly is simpler and does the same job. Gasless signing exists so the signer does not have to pay. A proof gadget does not provide that.

Having the caller expand the text, and then having the sponsor expand it again, is not a proof. It is duplicated work. Proof-of-work is also the wrong shape: it only rate-limits requests. It does not show that a statement belongs to the family.

## Consequences

A family document still describes how members are generated. It does not enroll them, and the tank does not learn about families. Setup scripts enroll the ids the sponsor named, and publish the family document. They do not publish or pin the long tail just so those ids can be sponsored.

Core statements stay the ones worth enrolling, which matches the rule that cores are the stable part of a family. Changing a long-tail paragraph does not strand a sponsored-id table we never built.

**Revisit if** a family is small enough that explicit enrollment is obviously cheap, or if a closed set of users makes a sponsor-run authorizer worth operating. Do not revisit because a zero-knowledge verifier got cheaper, unless the signer can build the proof in the browser at no extra charge. If they still pay someone, direct gas is still simpler.
