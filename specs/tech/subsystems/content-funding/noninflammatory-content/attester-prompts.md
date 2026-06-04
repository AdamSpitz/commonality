# Attester prompts for noninflammatory content

This document describes how the noninflammatory-content attester prompts are used. The exact prompt text lives with the service and should be edited there.

## Source of truth

Live prompt files:

- [Perspective-neutral](/content-attester/prompts/perspective-neutral.md)
- [Left evaluating right](/content-attester/prompts/left-evaluating-right.md)
- [Right evaluating left](/content-attester/prompts/right-evaluating-left.md)

End-user explanation:

- [The evaluator prompts](/docs/end-user/civility/evaluator-prompts.md)

Do **not** paste full prompt bodies into this spec. Prompt copies drift quickly; the service files above are the source of truth.

## How these prompts are used

Each content-attester deployment runs the same `content-attester/` service with different configuration:

- a prompt template from `content-attester/prompts/`
- a service identity / Ethereum key
- an alignment topic statement CID for the noninflammatory meta-statement
- thresholds for whether to publish a positive attestation

The service receives content to evaluate, plus optional context such as declared perspective and an optional target statement. It returns a civility decision, optional `supports_statement` decision, confidence, and short reasoning. Positive medium/high-confidence civility decisions publish `alignment(C, noninflammatory-meta)`. Positive medium/high-confidence support decisions publish a separate `alignment(C, S)`, so UI queries can show only content that is both civil and actually argues for the statement.

## Default prompt roles

- **Perspective-neutral:** evaluates whether content is noninflammatory in the general sense: could a thoughtful person who disagrees engage with it without feeling attacked?
- **Left evaluating right:** simulates a moderate left-leaning reader evaluating right-wing content.
- **Right evaluating left:** simulates a moderate right-leaning reader evaluating left-wing content.

The perspective-specific prompts are product-critical: they let creators write for a concrete audience, and they let users choose evaluators whose sensitivities they trust.

## Calibration notes

- The neutral attester may be too vague to be useful by itself; the perspective-specific attesters are usually more actionable.
- Asymmetric thresholds are expected. Different communities notice different failure modes.
- Err strict at first. False positives — labeling inflammatory content as noninflammatory — damage trust more than false negatives.
- Disagreement between evaluators is informative, not necessarily a bug.
