# Commonality verifier workspace

This directory is the project-specific workspace for the external `verifier` harness.

See the `using-verifier` AI skill for the harness model.

Current behavior is documented here and in the actual `*.def.json` files under `checks/`.

[`PLAN.md`](./PLAN.md) is only the remaining backlog.

## Harness setup

The `verifier:*` npm scripts call CLI binaries from the external verifier harness (`verifier-run`, `verifier-scheduler`, `verifier-heartbeat`, and `verifier-summarize`). They are not installed by this repository's `npm install`; install the harness before running verifier commands.

The code for the harness itself is probably in a sibling checkout at `../verifier`, in case you need to see it or make changes to it.

To install the harness CLI on a development machine:

```bash
cd ../verifier   # or wherever you checked out the verifier harness
npm install
npm run build
npm run install:global
```

After that, these commands should be on `PATH`: `verifier-run`, `verifier-scheduler`, `verifier-heartbeat`, `verifier-summarize`, and `verifier-tree`. From this repo, `npm run verifier:report` is the quickest smoke test that the harness is available.

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

## More stuff

See [TOO-VERBOSE-README.md](./TOO-VERBOSE-README.md) for more stuff.

Let's try to keep this README.md file more concise.

