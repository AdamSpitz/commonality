# The evaluator prompts

One of the promises of Civility is that you don't have to take any AI evaluator on faith: the default evaluators are open, and you can inspect exactly what they are asked to do.

## Source of truth

The live prompt files are the source of truth:

- [Perspective-neutral evaluator prompt](https://gitlab.com/AdamSpitz/commonality/-/blob/main/content-attester/prompts/perspective-neutral.md)
- [Left-evaluating-right prompt](https://gitlab.com/AdamSpitz/commonality/-/blob/main/content-attester/prompts/left-evaluating-right.md)
- [Right-evaluating-left prompt](https://gitlab.com/AdamSpitz/commonality/-/blob/main/content-attester/prompts/right-evaluating-left.md)

If the exact wording matters, read those files. This page explains what they are for, but deliberately does **not** paste copies of the prompts, so the public docs do not drift from the code.

## The three default evaluators

- **Perspective-neutral** — judges whether political content is written so that a thoughtful person who disagrees could engage with it without feeling attacked. It is not checking whether the content is centrist, correct, polite, or balanced.
- **Left evaluating right** — simulates a moderate left-leaning reader judging right-wing content. This is the filter a conservative writer wants to pass if they want their argument to reach open-minded people on the left.
- **Right evaluating left** — simulates a moderate right-leaning reader judging left-wing content. This is the mirror-image filter for progressive writers trying to reach open-minded people on the right.

The perspective-specific prompts are intentionally not generic "be nice" checks. They ask whether a reader from the other side would feel that the author understood them, respected their good faith, and engaged their strongest arguments.

## What the prompts are not doing

They are not deciding which side is right. They are not rewarding mushy centrism. Strong, one-sided arguments can pass if they are honest about trade-offs, avoid contempt, and make a case someone outside the author's tribe could actually hear.

They also are not meant to be the only possible standards. Different communities can run different evaluators, with different thresholds. Users choose which evaluators they trust.

## Why make prompts public?

Because the evaluator's judgment is only useful if people can inspect the standard being applied. If you disagree with the default prompts, you can ignore those evaluators, trust a different one, or run your own.
