# My concern

In the verifier workspace, I want to make sure the various "manual" verifier checks (i.e. the ones that use LLMs) run with a sufficient understanding of the system. That is, the "strongest" (but most expensive) version of an LLM-using check is" get a frontier-intelligence LLM up to speed (i.e. read quite a lot of the docs and specs, including the "founder"-level ones), then tell it to look at one page or use case or aspect or whatever. If we did all the tests that way, then the "test suite" would consist of a big list of many different aspects of the project (broken down along many dimensions: break down each site feature by feature, or look at scalability, or documentation coherence, or robustness, or whatever), and then each item is to be read as "read all the docs to get yourself up to speed with a founder-level understanding of the project, then look at X". Now, that's probably overly expensive (we can probably make at least *some* of those LLM-using checks do their job using a cheaper AI model and less reading of the docs and specs), but it's worth keeping it in mind as the "ideal" in the sense that it'd be like having an army of cofounders running all my tests and examining the project with that kind of high-level understanding. With that in mind... what does our current verifier suite look like, what "gaps" are there, what's running with too-much or too-little understanding or intelligence? How can we organize this verifier suite so that it gives me the confidence I want, without breaking the bank?

# AI response

I've now traced the whole suite — the check graph, the shared LLM machinery, the model router, and what context each check actually feeds its model. Here's the read.

## How the suite is built today

It's a genuinely mature QA org in miniature: ~110 check defs rolling up through four concern facets (`facet.functionality`, `facet.docs`, `facet.product`, `facet.security`) plus a meta layer into a single `root` go/no-go, with a `known-bad.*` verifier-of-verifier layer proving each check rejects bad input. The automated backing is real (lint/build/tests, testnet probes, indexer canaries, AI-fixture injection harnesses).

The **LLM-using checks** are the `review.*` leaves plus the `meta.*` reviewers and the `root` narrative. They all run through `lib/llm-judgment.mjs`, and that's where the story for your question lives. Every one of them invokes:

```
pi --print --no-session --no-tools --no-context-files --mode text @prompt
```

with a hand-built prompt containing a **bounded, hand-picked set of files** (`maxFileChars` 25k–60k). Model is chosen by `pi-model-router <taskKind>`:

- `big-picture-thinking` → `gpt-5.5` (frontier) — used by 5 checks: `review.workflow-clarity` ×4 and `meta.llm-check-review`.
- `clear-communication` → `deepseek-v4-pro` (cheaper) — used by 9: `landing-compelling`, `not-crypto-scary`, `docs-coherence`, `page-usability`, `page-copy-sense`, `page-visual-appeal`, `page-mobile-usability`, the `root` narrative, and `llm-to-automated-candidates`.

## The central gap: nothing is "brought up to speed"

Your ideal is *"read a lot of the docs/specs including founder-level, then look at X."* The suite does the **opposite**: `--no-tools --no-context-files` means no check ever reads anything autonomously. Each model sees only the narrow slice stuffed into its prompt, and **none of those slices contain founder-level material**. Concretely:

- `review.workflow-clarity` feeds 8 hand-picked files (a domain manifest, a landing page, a few components) + the domain inventory. No vision, no product spec, no "what is this workflow *for* at the strategy level."
- `review.landing-compelling` and `review.not-crypto-scary` judge whether the *value proposition* lands — the single highest-stakes go-to-market judgment in the whole suite — against ~60k of raw copy, with **no statement of what the value proposition actually is**, on the *cheaper* model.
- `meta.llm-check-review` reads only verifier-internal docs (README/PLAN/testing-plan/manual-validation-plan), not the product it's supposed to be assuring.

Meanwhile `workflow/roles/founder.md` already enumerates exactly the reading list a briefed cofounder would consume (standing-up-a-vertical, vision-and-strategy, specs/README, testing-plan). **It's wired into zero checks.** So the founder briefing exists as a document and is never injected anywhere.

## Where intelligence is mis-allocated

You're really turning *three independent dials* that the suite collapses into one vague "strength":

1. **Briefing depth** — how much of the project the model understands. Today: ~zero everywhere.
2. **Raw intelligence** — the model tier. Today: a binary frontier/cheap split.
3. **Surface breadth** — how much of the thing-under-test it sees. Today: bounded + sometimes sampled (`page-usability` caps at `maxPages: 10`).

The mismatches fall out immediately:

- **Too little of everything for the highest stakes:** `landing-compelling` / `not-crypto-scary` / `docs-coherence` — these are exactly the judgments where a briefed founder is irreplaceable, and they get the cheap model *and* no briefing. This is your biggest "I wouldn't trust the green" risk.
- **Wasted intelligence:** `review.workflow-clarity` pays for the frontier model but starves it of context — 8 files and no strategy. Frontier reasoning over a keyhole view isn't worth much more than cheap reasoning over the same keyhole.
- **No feature-by-feature army:** nothing enumerates the product the way you describe ("break each site down feature by feature"). The reviews take *one default workflow* or a *sample* of pages. There's no catalog of aspects, so coverage is whatever got hard-coded into a handful of `.mjs` defaults.
- **Whole-product coherence across the 8 sites** is unjudged by any single briefed reviewer; `coverage.domains` enumerates surfaces but no model reasons over the full cross-site story.

## How to organize it for confidence without breaking the bank

The highest-leverage move, and the cheap approximation of your ideal:

**1. Write a cached "founder brief" and inject it everywhere.** A new check produces a distilled few-thousand-token synthesis of the `founder.md` reading list (vision, value prop, the 8 sites, what "ready" means), refreshed only when those docs change. Every LLM check prepends it. This buys ~founder-level understanding at bounded, *shared, amortized* cost instead of re-reading specs per check. This is the single change that most closes the gap.

**2. Make "briefing depth" an explicit parameter, like `taskKind`.** Tag each check `briefing: none | product | founder`. Then briefing and intelligence become two knobs you set per check by *stakes*, not by accident:
   - Go/no-go product judgments (`landing-compelling`, `not-crypto-scary`, `docs-coherence`, `workflow-clarity`) → `founder` brief + frontier model, run `manual`/rarely (they already are manual).
   - Mechanical local judgments (`page-copy-sense` on one page, JSON-shape checks) → `none` + cheap + cron.

**3. Turn the "army of cofounders" into an explicit, mostly-dormant catalog.** Encode the aspect list (each site × feature; plus cross-cutting axes: scalability, doc coherence, robustness) as data, each item meaning "founder-briefed, look at X." Then *sample* a rotating subset per cycle (the `maxPages` pattern, generalized). You get the full matrix on paper, frontier-quality on the few that run each day, and the cost stays flat.

**4. Keep pushing judgments down the stack.** `meta.llm-to-automated-candidates` already exists for exactly this — every stable LLM judgment promoted to a deterministic test frees budget for the expensive briefed reviews. That's how the bank stays unbroken as the catalog grows.

Net: you'd end up with cheap/unbriefed checks on cron catching mechanical regressions continuously, and a small rotating set of **frontier + founder-briefed** reviews — the literal "cofounder reads up, then examines one aspect" — running on the expensive aspects deliberately and rarely.

The founder-brief context module (#1) is the keystone and is self-contained. Want me to draft it — a `meta.founder-brief` check that synthesizes the briefing and a `briefing` param in `lib/llm-judgment.mjs` that injects it — so you can see the shape before deciding how widely to apply it?

# My response

Interesting. A founder-brief document sounds like a useful thing to have... but OTOH I'm wary of creating potentially-stale documentation, and I'm wary of summarizing in situations where the details might matter. And as an alternative, I want to point out that part of the documentation strategy for this entire project has been to try to have *really really good* documentation, arranged in a hierarchical sort of way, written clearly enough to enable a fresh LLM with a particular purpose to know what it needs to read and what it doesn't need to read. I'm inclined to suggest that all of these various LLMs (for each verifier check) should be told their specific purpose and then given a link to the top-level project README.md, so that they can simply use their judgment and read whichever documentation they need to (while being warned to be careful not to bother reading stuff that's obviously irrelevant for their purpose). (And if the project's documentation isn't organized in a way that makes that viable for some of the verifier checks, the docs' organization should be improved to fix that.)

# AI response

You've talked me out of the brief, and I think you're right — a brief is a second source of truth that drifts, and it pre-summarizes exactly where you don't want summarizing. The live-docs approach is strictly closer to your ideal ("read a lot, then look at X") rather than an approximation of it.

`pi --tools read,grep,find,ls` is exactly read-only mode (the docs even call it that). The current checks hard-code `--no-tools` in `defaultPiArgs` (`lib/llm-judgment.mjs:142`); your proposal is essentially swapping that one flag for a read-only allowlist and changing the prompt from "here are 8 files" to "here's your purpose, start at README.md, read what you need." So this is a small mechanical change at the core, not a rewrite.

Here's my honest assessment of the idea and what it forces.

## Why your instinct is right

- **It's the ideal, not an approximation.** "Frontier model + its own judgment over primary sources" is literally what you described wanting. The brief was me trying to dodge cost; you'd rather pay for the real thing and lean on doc quality to keep the bill down. Defensible.
- **No lossy summary where details matter.** The model reads the actual spec, not my digest of it. Your "details might matter" worry disappears.
- **Single source of truth.** No drift surface. The thing it reads *is* the thing that's true.
- **It makes the verifier a forcing function for documentation.** This is the part I like most and didn't have before: a check that flails because it couldn't find what it needed is now a real, observable signal that the docs are badly organized — for exactly the "fresh purpose-driven LLM" you've been optimizing the docs for all along. The same hierarchy serves human contributors, fresh coding agents, *and* the verifier. One investment, three payoffs.

## What it actually costs you (the real trade)

The current `lib/llm-judgment.mjs` design buys one thing with `--no-tools`: a **hard, bounded, deterministic prompt**. Known token ceiling, known cost, identical inputs every run. Free reading trades that away for:

1. **Variable cost/latency.** A check might read 4 files or 40. Your "without breaking the bank" concern comes back — but now it's bounded by *doc quality plus an explicit budget in the prompt* rather than by a hard cap. Good docs → cheap runs; sprawling docs → expensive runs, which is itself the signal to fix the docs.
2. **Nondeterministic evidence.** Two runs may read different things. This matters for a *verifier* specifically, because your whole integrity story is "you can audit why a check said what it said."

Both are manageable, and the mitigations are what make this production-grade rather than just "give it tools and hope":

- **Record what it read.** Have each check emit the list of files it opened as an artifact, alongside its findings. Now "did this LLM actually understand the system?" is inspectable — you (or `meta.llm-check-review`) can see it read the vision doc before judging the landing page, or catch it judging blind. This converts the nondeterminism from a risk into auditable evidence.
- **Reuse the reading lists you already built instead of the raw README firehose.** You already have `workflow/roles/{founder,product-manager,end-user,...}.md` — curated, hierarchical entry points. A verifier check *is* an employee in one of those roles looking at one aspect. So the prompt becomes "You are a [founder] examining [whether the landing page is compelling]. Start at README.md, follow the guidance for your role, read what you judge relevant, skip the obviously irrelevant." That reuses the pruning work the hierarchy already encodes, and it's a tighter test of those docs than raw README would be.
- **Keep it only for high-altitude checks.** `landing-compelling`, `not-crypto-scary`, `docs-coherence`, `workflow-clarity`, the meta reviewers — these need to roam. `page-copy-sense` on a single page or a JSON-shape check do not; leave them `--no-tools` and cheap. So "briefing depth" stays a per-check dial — it's just implemented as *tool access + entry point* rather than *injected summary*.
- **`known-bad.*` fixtures are unaffected.** They inject canned responses via the `fixtureEnvVar` path and never hit the live model, so the verifier-of-verifier layer keeps working unchanged.

## The one thing to settle by trying it, not arguing it

Whether the docs are *actually* good enough for this to work is an empirical question, and it's the whole bet. So I'd prototype on **one** check before converting the suite — and `review.workflow-clarity` is the obvious pick: it already runs the frontier model and is currently the most context-starved (8 hand-picked files, no strategy), so it has the most to gain and will most sharply expose doc gaps.

Run it both ways and look at three things: (1) does the recorded reading list show it found the right docs from README alone? (2) what did it cost / how long? (3) does it surface "I couldn't find X" — which is your docs-improvement to-do list writing itself. That tells you whether to roll it out broadly, and simultaneously gives you the first round of doc-organization fixes.

Want me to wire up that single-check prototype — read-only tool access + a role-and-purpose prompt + a "files I read" artifact on `review.workflow-clarity` — so you can judge the approach on real output?

# My response

I like your mitigation suggestions. I'm not too worried about doing a trial run - this feels to me like the right approach, and in any case I haven't been using the old system long enough to really be able to compare it with this new version. Let's just go ahead and implement this new way of doing things.
