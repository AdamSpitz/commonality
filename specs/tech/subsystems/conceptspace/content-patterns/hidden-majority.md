# Hidden-majority content pattern

This is the technical note for the hidden-majority pattern used by Conceptspace, CSM, the bridge creator, and seed content.

## Source of truth for the concept

The user-facing explanation is canonical:

- [Hidden-majority patterns](/docs/end-user/csm/hidden-majority-patterns.md)

That page explains the thesis, sub-patterns, examples, bilateral/conditional support, and how the mediator uses the pattern. Do not maintain a second full conceptual version here.

## What the technical system needs from this pattern

For implementation purposes, hidden-majority content tends to involve three statement families:

- **Pole statements** — loud/fringe positions that dominate discourse and make each side misread the other.
- **Normal-side statements** — statements that people on one side can naturally sign without feeling like they betrayed their side.
- **Common-ground statements** — statements implied by compatible normal-side statements, often representing the hidden majority.

The bridge-creator and related nudgers use this shape to propose modified statements that can honestly imply a common-ground statement. The implication attester should only publish links where the modified statement really entails the common-ground statement; synthesis itself belongs to the nudger/mediator layer, not to implication attestation.

## Implementation pointers

- Product spec for synthesis: [bridge-creator](/specs/product/bridge-creator.md)
- Nudger architecture: [nudges](../nudges.md) and [general nudger service](../../nudger/README.md)
- CSM strategy prompt: [bridge-creator/prompts/csm-strategy.md](/bridge-creator/prompts/csm-strategy.md)
- Seed examples: [seed-content/hidden-majority.md](../seed-content/hidden-majority.md)
- Noninflammatory-content distribution mechanism: [noninflammatory content funding](noninflammatory-content.md)

## What these statements are useful for

- **Head count:** supporter counts reveal that a position has broader support than the current discourse suggests.
- **Funding:** projects and content can align themselves with common-ground statements, attracting support from people who did not coordinate and may not share a political identity.
- **Discovery:** the system can route users from their own wording to nearby statements, bridge statements, or projects without forcing everyone to standardize on one slogan.
