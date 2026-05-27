# CSM mediator diagram

`csm-mediator-diagram.svg` — a diagram of the core Common Sense Majority idea: how the mediator reveals hidden common ground. See [the hidden-majority spec](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md) and [the mediator vision doc](/docs/end-user/csm/mediator.md).

## What it depicts

Two dimensions:

- **Horizontal = the political spectrum** (blue left → red right), shown as a gradient bar.
- **Vertical = the work the mediator does.** Height is *not* a political quantity; it's "distance traveled toward reconciliation."

Seven positions:

- **extreme left / right** — the loud fringe.
- **moderate left / right** — what most people on each side actually think.
- **nudged left / right** — the *same* moderate position, rephrased by the mediator.
- **common ground** (green peak, center-top) — the position both rephrasings point at.

## Why it's drawn this way

- **All five spectrum positions (extremes + moderates) sit on a single bottom row.** This is deliberate and load-bearing: the mediator did *no* work to make the moderates moderate. The whole CSM thesis is that the sane majority *already exists* — it's just invisible. Putting moderates on the same row as extremes says "this is the spectrum as it already is," not "the mediator pulled people toward the center."
- **Nudge arrows go nearly straight up, not inward.** The mediator is mostly *rephrasing*, not extracting concessions or putting words in people's mouths. Keeping the arrows near-vertical avoids implying the mediator drags people toward each other. (A *separate* "compromise in the middle" variant — not yet drawn — would angle these arrows slightly inward to depict minor mutual concessions.)
- **The peak is reached by a passive dashed roofline**, not by arrows. Common ground *emerges* as the thing both rephrased positions imply; nobody gets pushed up to it.
- **Extremes are faded and unconnected.** They're part of the spectrum but no arrow lifts them — the mediator isn't bridging the fringe, and it shouldn't look like it is.
- **The peak is green, not purple.** A blended blue+red would read as "centrist mush / split the difference." Green says the common-ground statement is a *third thing* both sides genuinely reach, not a midpoint.
- **The silhouette is a roof/peak.** A loose house metaphor (shared roof = shared home) is welcome but kept implicit — no literal walls or door, which would get cheesy and distract from the data.

## Variants (possible future diagrams)

The [hidden-majority sub-patterns](/specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md#sub-patterns) imply different geometries, e.g.:

- **Compromise in the middle** — nudge arrows angle inward (concessions).
- **No major controversy** — moderates start nearly touching; nudges are tiny.
- **Same values, different beliefs** — the peak is conditional ("if X then Y"), perhaps a fork.
- **Coalition unbundling** — one bundle splits into several mini-diagrams.

This canonical SVG depicts the "rephrasing only" case (the *misunderstandings* / *no-controversy* patterns).

## Regenerating the PNG

The committed asset is the SVG (editable, text-accurate). To render a raster copy:

```
inkscape "$PWD/csm-mediator-diagram.svg" --export-type=png --export-filename="$PWD/csm-mediator-diagram.png" -w 900
```
