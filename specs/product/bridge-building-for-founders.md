# Bridge-building as a founder building block

Today the [bridge-creator](./bridge-creator.md) exists as a single instance serving one
vertical: Common Sense Majority. This doc asks what it would take for **any cause founder**
to stand up their own bridge-builder — a *mediator for their cause* — and offer it through
[CauseStarter](/causestarter/README.md), the same way they'd pick up delegation or content
funding as a tool.

**Second tenant — decided 2026-08-09: cause-assist is a strategy configuration on this
engine, not a parallel implementation.** It threads the same needle as the mediator (a
statement crisp enough for the implication attester and natural enough that someone will
sign it), so it shares the engine and the
[hidden-majority pattern catalog](/docs/end-user/common-sense-majority/hidden-majority-patterns.md)
— but never a strategy prompt, since a cause founder mobilizes a side where the mediator
de-polarizes one. The reasoning is in
[shaping-your-cause-statements.md](/docs/founder/shaping-your-cause-statements.md).

This makes the engine multi-tenant across two *kinds* of tenant, which sharpens the
generalization work below rather than adding to it: the vocabulary in Tier 1 must cover a
founder's planks as well as a mediator's sides, and the config artifact in Tier 2 becomes the
seam a plank-authoring strategy plugs into. Three concrete capabilities are specified in
[§ What cause-assist should do](/docs/founder/shaping-your-cause-statements.md#what-cause-assist-should-do)
— atomize a bundle label into planks, sharpen a plank, draft an anchor from planks — and are
queued in [TODO.md](/TODO.md).

**Revisit if:** plank-authoring turns out to need a materially different synthesizer schema or
context-source model than bridge triples do. Sharing the engine is justified by the shared
needle and pattern catalog; if the shared surface shrinks to just the LLM client, the two
should split again.

The founder-first triage rule from [founder-first.md](./founder-first.md) applies: this is
"making a founder's job easier," so it's core platform work. But the *opinion* stays with
the founder. We ship the engine; they write the strategy prompt and curate the anchors. If
we end up authoring bridge policy for other people's causes, we've built the wrong thing.

## The pitch to a founder

Not "bridge-building" — **"a mediator for your cause."**

Most causes worth founding have an internal fault line, not just an external enemy. A local
housing cause has homeowners and renters. A church cause has traditionalists and reformers.
A software commons has maintainers and downstream users. Each side would sign a statement
the other could live with, if someone did the work of finding the wording. That's the job.

CSM's left/right framing is one instance of this, not the general case. Nothing in the
machinery depends on politics.

What a founder gets:

- An AI service, running under **their** key and **their** prompt, that watches activity on
  their cause and periodically publishes bridge triples: a statement each side can sign, plus
  the common ground both imply.
- Those triples appear as nudges to supporters who have **opted in** to that mediator in
  their client. Nobody is nudged by a mediator they didn't choose.
- A public bridges page on their cause showing the featured set.
- An inbound `POST /propose-bridge` channel so their own community (or a neighboring cause)
  can suggest bridges the mediator will consider — without weakening its trust model.

What a founder owes:

- A **strategy prompt**. This is the product. It's where "what counts as a good bridge for
  *my* cause" lives, and it can't be defaulted for them.
- A **seed anchor set** — a handful of hand-written `{side-a, side-b, common-ground}` triples
  that show the mediator what good looks like.
- **Operator attention**: the anchor-reflection job proposes new anchors, and a human
  approves them via CLI. Advisory-only, by design.
- A **signer key** and somewhere to run it (or a slot in a hosted `service-host` bundle).

## Why this is mostly a packaging job

The engine is already data-driven and multi-tenant-shaped. Concretely:

| Piece | State today |
|---|---|
| Context sources | `BRIDGE_CREATOR_CSM_CONTEXT_SOURCES` — arbitrary JSON list of beat-agent endpoints with expected signer addresses. Only the env-var *name* is CSM-specific. |
| Anchors | JSON store at `BRIDGE_CREATOR_ANCHOR_STORE_PATH`, with `status`/`featured` gates and an operator CLI. Seeded, not hardcoded. |
| Strategy prompt | A file (`services/bridge-creator/prompts/csm-strategy.md`), served at `GET /strategy-prompt`. |
| Deployment | [`service-host`](/service-host/README.md) already hosts `bridge-creator` and `beat-agent` as *named instances* with per-instance config objects and their own signer keys. A second mediator is a config entry, not new code. |
| Client opt-in | `useTrustedNudgers` + the `?addNudger=…` deep link are generic. `ui/src/shared/nudges/csmMediatorNudger.ts` is a thin wrapper over one env var. |
| Nudge display/dismissal | `ui/src/shared/nudges/nudgeStore.ts` is nudger-agnostic; needs nothing. |
| Inbound proposals | `POST /propose-bridge` (paid, x402) already accepts suggestions from anyone, including other founders. |

The CSM-specific surface is small and named:

1. `services/bridge-creator/prompts/csm-strategy.md` — genuinely cause-specific, and *should* be.
2. `services/bridge-creator/data/seed-anchors.json` — CSM political triples.
3. The **left/right role vocabulary**, which is shallower than it looks: `REQUIRED_CLUSTER_ROLES`
   in `services/bridge-creator/src/anchorCli.ts`, the `modified_left`/`modified_right` schema
   field names in `src/synthesizer.ts`, and prose in the prompt.
4. **UI**: `ui/src/domains/common-sense-majority/csmBridges.ts` hardcodes seed anchors in the
   frontend instead of fetching `GET /anchors?featured=true` (the endpoint already exists),
   and `csmMediatorNudger.ts` hardcodes CSM naming and copy.

## What to build

### Tier 1 — Generalize the vocabulary

Roles become `side-a` / `side-b` / `common-ground`, with a per-instance **label pair** the
founder sets (`["left", "right"]`, `["homeowners", "renters"]`, …) that gets interpolated into
the strategy prompt and the synthesizer schema. Add non-CSM env aliases
(`BRIDGE_CREATOR_CONTEXT_SOURCES`) keeping the old names working. Nothing else in the engine
cares about the role strings.

Keep `common-ground` as a fixed third role — it's structural, not vocabulary.

### Tier 2 — One config artifact per mediator

A mediator instance is: strategy prompt + seed anchors + context sources + label pair +
signer key. Today that's scattered across an env table, a prompts directory, and a JSON file.
Bundle it into one checked-in config (or one `service-host` service entry) and add a scaffold
command that emits a filled-in template from the cause's founding statement — the same
cause-assist path CauseStarter already uses for drafting.

This is where most of the "make it easy for him" value lives. The founder should be editing
one file with obvious blanks, not reverse-engineering an env table.

### Tier 3 — Reusable UI blocks

Two components, parameterized by nudger address + service URL rather than by CSM:

- **Bridges display block** — generalize `csmBridges.ts` to fetch `GET /anchors?featured=true`
  from a configured service. See [csm-bridges-page.md](./csm-bridges-page.md) for the page this
  generalizes.
- **Mediator opt-in block** — generalize `csmMediatorNudger.ts` to take name, description, and
  address from cause config, and produce the existing `?addNudger=…` deep link.

In CauseStarter this becomes an entry in `SUPPORTING_TOOLS` (`causestarter/src/lib/tools.ts`)
plus a field on the cause record pointing at the founder's mediator address and service URL.

### Tier 4 — The beat-agent dependency

A bridge-creator with no live context degrades to restating its seed anchors forever. Genuine
bridges need a beat agent ingesting activity for the cause. That layer is scaffolded but
**unrehearsed** — see [bridge-creator-csm-next-steps.md](/workflow/bridge-creator-csm-next-steps.md),
where standing up `us-political-csm` is still largely unchecked.

Two honest consequences:

- A founder shipping before the rehearsal lands gets an **anchors-only mediator**. That's still
  useful with a good strategy prompt, and it's a legitimate v1 offering — but say so plainly in
  the founder docs rather than implying live synthesis.
- The work is the same work CSM already needs, so it isn't extra scope — it just isn't a
  prerequisite for Tiers 1–2 either. See Sequencing below.

## Sequencing

Two tracks, in parallel:

**Track A — generalization.** Tier 1 + Tier 2 together; vocabulary and config packaging are one
refactor, and neither depends on live context. Then Tier 3 UI blocks and the CauseStarter tool
entry. Roughly a week of focused work.

**Track B — CSM beat-agent stand-up and end-to-end rehearsal**, already on the critical path for
CSM regardless.

The tracks touch different layers (synthesizer/config/UI vs. beat-agent ingestion), so they
shouldn't collide. Two things to watch:

- **The rehearsal may want the Tier 1 rename.** If Track A lands first, rehearse against the new
  role vocabulary; if not, the compatibility aliases mean the rehearsal config keeps working
  either way. Don't block either track on the other.
- **Don't finalize the Tier 2 config surface until the rehearsal reports back.** Ship it, but
  treat the knob set as provisional for one revision — a real run is the only thing that shows
  which knobs a founder actually needs, and guessing is the main risk of parallelizing.

Founder docs last, once both tracks have landed: a "mediator for your cause" guide under
`docs/founder/`, alongside [standing-up-a-vertical.md](/docs/founder/standing-up-a-vertical.md).

## Deliberately not doing

- **Writing strategy prompts for founders.** Offer an annotated example (CSM's) and a scaffold
  with blanks. Never a default that silently becomes our opinion running under their name.
- **Hosting every founder's mediator ourselves.** `service-host` makes it possible, and we may
  offer it, but the design assumes the founder operates it. See
  [ui-operator-posture.md](./ui-operator-posture.md) for why that boundary matters.
- **A mediator registry or marketplace.** Opt-in is per-nudger via deep link today; that's
  enough until there are more than a handful.
- **Cross-cause bridge federation as a service mesh.** `POST /propose-bridge` already lets one
  cause's mediator suggest wording to another's. The durable join when parents are causes is a
  [bridge cluster](./bridge-causes.md) (modified causes + bridge cause), which a human can
  author without running this service.
- **More than two sides.** A cause with three real factions can run multiple mediators or
  multiple anchor clusters. Generalizing the role model to N sides buys nothing yet.
