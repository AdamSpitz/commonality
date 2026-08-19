# How a mediator sets up “the Other Cause”

The create-bridge walkthrough used to assume the other camp already published a
cause and that you had its link. That is one path, not the only one.

**Natural** in a [bridge cluster](/specs/product/bridge-causes.md) means “this is
that camp’s position,” not “someone else published it first.” Duplicate causes
packaging similar ideas are fine. Statements exist independently of causes.
[ADR 0011](/specs/decisions/0011-organizer-contact-is-pull.md) already allows a
mediator to author “the other side” themselves.

This note is the product rule for that path. Wording help remains
[bridge-cluster-wording-help.md](./bridge-cluster-wording-help.md): one-shot
verbs and an exportable brief, not a hosted mediation chat.

## Two missing-parent cases

They are different objects. Do not stretch `draftModifiedPlank` to cover both.

### 1. There is a real camp, but they never published a cause

A Christian who roughly understands secular conservatives can write a thin
**stand-in cause**: “this is what I think that camp actually believes.” That
page is *not* a modified cause. A modified cause is “wording people who already
support parent *P* might also sign.” If there is no *P*, there is nothing to
sliver.

The mediator publishes the stand-in under **their own key**, labeled as a
mediator-authored stand-in, never as “Secular Conservatism official.”

### 2. The camp exists as statements, not as a cause

Packaging, not invention: pick existing statements, wrap a thin roster, point
the cluster at it. Near-duplicate suggestions (below) help here. We do not
operate a cause directory ([ADR 0008](/specs/decisions/0008-operated-surfaces-are-lenses.md)).

## Stand-in vs modified

| | Stand-in natural cause | Modified cause |
|---|---|---|
| Role in the cluster | Parent \(C_i\) | \(C_{im}\) |
| Whose position | The other camp, as the mediator understands it | A thinner wording of an *existing* parent |
| Who publishes it | Mediator | Mediator |
| Label | Loud: mediator-authored stand-in | Loud: mediator’s wording of this side |
| `draftModifiedPlank` | Does not apply (no parent texts) | Requires loaded parent planks |

A thin stand-in may **skip the modified column** and imply the bridge from the
stand-in planks (`parent-to-bridge` pairs). Forcing a modified-of-a-stand-in
you just wrote is theater. When a real parent appears, **re-parent**: point the
cluster at the real natural cause and keep the stand-in as modified (or as a
rival stand-in). Do not rewrite history.

## What the UI must offer

On `/bridge/new`, each parent slot has three ways in:

1. Paste a cause link / owner+slug and load the published roster.
2. Pick a cause already on this device.
3. **No published cause yet — start a thin sliver I will own.**

(3) is a first-class parent state. Parent planks are editable. Authorship copy
says the mediator owns the page.

## LLM verbs

Keep `POST /draft-modified-plank` gated on 1+ parent planks.

Add `POST /draft-stand-in-sliver`: side label, optional bullets / “must not
caricature” / complaint, optional current draft. Returns a short roster
(title, summary, 2–4 planks) plus warnings if it sounds like the *mediator’s*
camp. Proposal only; the human publishes.

The export brief includes stand-in parent texts, not only modified drafts.

## Near-duplicates (not a directory)

After a stand-in plank exists, rank **candidates the client already has**
(causes on this device, loaded parent planks) by text overlap. Suggest a CID
to attach; never auto-pick “the” other movement. Implication-graph
more-popular nudges are for **signers**, not this editor. Do not add a hosted
“find the other camp” search.

## Seed

Local seed publishes a **secular-conservative** cause (its own founder key)
alongside Christianity, so the walkthrough can show both “paste a link” and
“I wrote the other sliver.”
