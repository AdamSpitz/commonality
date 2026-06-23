# Commonality verifier workspace

This directory is the project-specific workspace for the external `verifier` harness.

See the `using-verifier` AI skill for the harness model.

Current behavior is documented here and in the actual `*.def.json` files under `checks/`.

When a check fails and you need more info about the project, start from the top-level [README.md](/README.md); if you can't find the info there, ask the user and then find a good place within the repo to add the info so that you *would* have found it (because it's important that info be efficiently findable).

[`PLAN.md`](./PLAN.md) is only the remaining backlog.

## Harness setup

The `verifier:*` npm scripts call CLI binaries from the verifier harness (`verifier-run`, `verifier-scheduler`, `verifier-heartbeat`, `verifier-summarize`, and `verifier-tree`). The harness is published as the `@adamspitz/verifier` npm package and is installed by this repository's normal `npm install` as a dev dependency.

From a fresh checkout, run:

```bash
npm install
npm run verifier:report
```

The npm scripts use `node_modules/.bin`, so no separate global install or sibling checkout is required. If you want the commands available outside npm scripts, install the package globally too:

```bash
npm install -g @adamspitz/verifier
```

From this repo, `npm run verifier:report` is the quickest smoke test that the harness is available.

## Pointing the harness at the Commonality verifier workspace

There's a `.envrc` file that contains `VERIFIER_WORKSPACE=verifier`, which the verifier should respect.

## Big overarching goal

I want this verifier workspace to grow into something that could conceivably at some point start giving me confidence that this whole huge crazy project actually works.

That doesn't just mean "basic functionality tests pass", but also "docs make sense" and "landing pages are compelling" and "performance is acceptable" and "UI offers a clear way to complete all the various workflows we want to support" and meta-stuff like "we're actively looking for ways to improve this verification system" and "we're watching for tasks that are currently being done as part of the LLM-based checks and looking for opportunities to turn them into conventional automated tests" and whatever else you can think of that would be worthwhile.

If this project were being run as a startup company and I was the founder, I'd have employees - not just to implement the code (which is the main thing I've been using LLMs for), but also to test it and reassure me that the thing actually works. (Automated tests are fine and good and we've got lots of those, but the founder would still insist on humans actually using the software and thinking it through and so on.)

I don't want to hire any real human employees; I want to use LLMs instead. (Not necessarily running as long-running autonomous agents; I doubt that's necessary. I just mean: defining the "employees'" roles and using LLMs to carry out those roles.)

So if you're an AI who's been asked to help me design this system of verifier checks, the question to ask is: If you were the founder of this project, what kinds of roles would you want to see filled by intelligent employees, such that if they came to you and said "yup, the project works, it's doing what it's supposed to do", you'd be satisfied with that and you'd feel confident in going to the world and saying "come see this project, it's ready to be used"?

## Other documents in this repo about testing

The substantive test strategy this workspace operationalizes lives alongside it:

- [`testing-plan.md`](./testing-plan.md) — the "big test plan": what launch confidence means, cost guardrails, the validation passes, and the component/environment/cross-cutting coverage checklists. `coverage/testing-plan-items.json` maps its major sections and explicit launch-confidence dimensions (including performance acceptability) to verifier check IDs or known-gap records.
- [`manual-validation-plan.md`](./manual-validation-plan.md) — the manual/LLM validation roster: the pass runbook, report template, per-domain and per-role checklists, and the automation backlog. `coverage/validation-roster.json` maps its role groups to checks or explicit exclusions.

Honestly, it might make sense to just absorb that stuff into the verifier checks. Those documents are a bit old; if it would make sense to dismantle them once the verifier checks embody them, that's fine.

## Operating model: refreshes, staleness, and the dashboard

- The single top-level dashboard is `root`: run `npm run verifier:root` for the JSON rollup/report, or `npm run verifier:tree` to drill into it interactively.
- Leaf checks read the live project/system. Cheap leaves should use `cron`; expensive/manual/LLM leaves are intentionally `manual` unless their definition says otherwise.
- **Exploration-mode LLM leaves.** The high-altitude judgment leaves (`review.workflow-clarity*`, `review.landing-compelling`, `review.not-crypto-scary`, `review.docs-coherence`, and the `meta.llm-*` reviewers) do not get a hand-picked bundle of files stuffed into their prompt. Instead they are told their role and purpose, pointed at the top-level [README.md](/README.md), and given read-only repo access (`pi --tools read,grep,find,ls`) so they brief themselves from the docs hierarchy the way a person in that role would — then judge. This makes the verifier a forcing function for documentation quality: if a leaf can't find what it needs from the README down, that's a reportable docs-organization gap (and shows up as a `docs-gap` finding). Each such leaf writes a `files-read.md` artifact recording what it read, so you can audit whether it actually understood the system. The shared machinery lives in `checks/lib/llm-judgment.mjs` (`explorationBriefing`, the `explore` flag on `getLlmResponse`, `writeFilesReadArtifact`); a leaf opts in by passing `explore: true`. Mechanical, page-local leaves (e.g. `review.page-copy-sense`) deliberately stay sandboxed (`--no-tools`) and cheap.
- Deterministic inner nodes should use `onInputChange`; they rerun automatically when a child result changes while `verifier-scheduler` is running. `root` is also `onInputChange`, so the top-level report follows refreshed facets automatically.
- Supervisors use `freshness.requiredMaxAgeMinutes` to turn old non-failing child results into `uncertain`. That is the warning that the evidence is old enough that you should consider refreshing the child.
- `meta.report-currency` runs hourly and cheaply rechecks whether commits since the last evaluation plausibly invalidate checks; it is advisory and appears in the root report without gating the root status.
- `meta.liveness` runs every 30 minutes and warns when scheduled checks have gone silent or overdue.

For an ongoing session, run `npm run verifier:run` in a long-running terminal. Without the scheduler, `onInputChange` does not fire on its own; manual `verifier-run <id>` still updates descendants' inputs for the next run.

## More stuff

See [TOO-VERBOSE-README.md](./TOO-VERBOSE-README.md) for more stuff.

Let's try to keep this README.md file more concise.

