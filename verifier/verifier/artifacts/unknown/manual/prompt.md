You are a skeptical technical editor reviewing Commonality's documentation surface for coherence.

Your job is to judge whether these docs make sense *together* as a description of one product. Do not praise; find problems. Read as a newcomer who must act on these instructions.

Look for:
- internal contradictions (two docs describing the same thing differently);
- stale instructions (commands, paths, env vars, or flows that no longer match what other docs describe);
- conceptual incoherence (terms used inconsistently, undefined jargon, a value proposition that shifts between documents);
- broken or dangling references (a doc points at a file marked `<MISSING>` above — do NOT flag references to files that simply weren't included in this surface, as the surface is intentionally bounded);
- instructions a newcomer could not actually follow to completion.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "contradiction" | "stale" | "incoherence" | "broken-reference" | "unfollowable",
      "evidence": ["specific doc/section/quote evidence"],
      "recommendation": "concrete doc fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible coherence problem needing human triage.
- Use "pass" only if the supplied docs are coherent and you have no material findings after actively reviewing them.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.
- If a file is marked `<MISSING>`, judge whether its absence breaks coherence (e.g. another supplied doc references it). Files not present in this surface may still exist in the repo — absence from the surface is not a broken reference.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": a contradiction or broken instruction that would actively mislead a newcomer or block them from completing a documented flow.
- "medium": real incoherence or staleness that causes confusion but has a workaround.
- "low": polish, wording, or minor drift.

Path convention for the supplied surface: paths beginning with `../` are relative to the repository root from this verifier workspace; paths without `../` are files inside `verifier/` (for example, `testing-plan.md` means `verifier/testing-plan.md`). Treat `CONTINUITY.md` as historical change notes, not canonical current instructions, unless a current navigation page points readers to a stale entry as current guidance.

Supplied documentation surface follows.

## ../README.md

# Commonality verifier workspace

This directory is the project-specific workspace for the external `verifier` harness.

See the `using-verifier` AI skill for the harness model.

Current behavior is documented here and in the actual `*.def.json` files under `checks/`.

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

## More stuff

See [TOO-VERBOSE-README.md](./TOO-VERBOSE-README.md) for more stuff.

Let's try to keep this README.md file more concise.



---

## ../CONTINUITY.md

<MISSING>

---

## ../TODO.md

<MISSING>

---

## ../workflow/task-tiers.md

<MISSING>

---

## ../inbox.md

<MISSING>

---

## README.md

<MISSING>

---

## ../workflow/project-status.md

<MISSING>

---

## ../specs/user-docs.md

<MISSING>

---

## ../workflow/reviews/README.md

<MISSING>

---

## ../workflow/branching.md

<MISSING>

---

## ../testnet-prep.md

<MISSING>

---

## ../AGENTS.md

<MISSING>

---

## ../docs/dev/architecture.md

<MISSING>

---

## ../hardhat/README.md

<MISSING>

---

## ../sdk/README.md

<MISSING>

---

## ../indexer/README.md

<MISSING>

---

## ../integration-tests/README.md

<MISSING>

---

## ../fake-data-generation/README.md

<MISSING>

---

## ../attester-core/README.md

<MISSING>

---

## ../implication-attester/README.md

<MISSING>

---

## ../content-attester/README.md

<MISSING>

---

## ../finder-core/README.md

<MISSING>

---

## ../implication-finder/README.md

<MISSING>

---

## ../content-finder/README.md

<MISSING>

---

## ../nudger-core/README.md

<MISSING>

---

## ../implication-graph-nudger/README.md

<MISSING>

---

## ../bridge-creator/README.md

<MISSING>

---

## ../explorer-curator/README.md

<MISSING>

---

## ../beat-agent/README.md

<MISSING>

---

## ../service-host/README.md

<MISSING>

---

## ../platform-api-service/README.md

<MISSING>

---

## ../ui/test-plan.md

<MISSING>

---

## ../docs/end-user/tldr-for-llms.md

<MISSING>

---

## ../docs/founder/christian-pitch.md

<MISSING>

---

## ../docs/end-user/common-sense-majority/trust-model.md

<MISSING>

---

## ../docs/end-user/common-sense-majority/mediator.md

<MISSING>

---

## ../docs/end-user/lazyGiving/assurance-contracts.md

<MISSING>

---

## ../docs/end-user/lazyGiving/retroactive-funding.md

<MISSING>

---

## ../docs/end-user/commonality/how-actions-compound.md

<MISSING>

---

## ../ui/README.md

<MISSING>

---

## ../workflow/roles/README.md

<MISSING>

---

## ../workflow/roles/developer.md

<MISSING>

---

## ../workflow/roles/end-user.md

<MISSING>

---

## ../workflow/roles/founder.md

<MISSING>

---

## ../workflow/roles/product-manager.md

<MISSING>

---

## ../workflow/roles/tech-lead.md

<MISSING>

---

## ../workflow/local-development.md

<MISSING>

---

## ../workflow/build.md

<MISSING>

---

## ../workflow/deployment.md

<MISSING>

---

## ../workflow/commonality-works-setup.md

<MISSING>

---

## ../workflow/hostinger-dns-setup.md

<MISSING>

---

## ../workflow/reviews/before-testnet.md

<MISSING>

---

## testing-plan.md

<MISSING>

---

## manual-validation-plan.md

<MISSING>

---

## PLAN.md

<MISSING>

---

## ../specs/README.md

<MISSING>

---

## ../specs/product/ui-domains.md

<MISSING>

---

## ../specs/product/ai-assistance.md

<MISSING>

---

## ../specs/product/bridge-creator.md

<MISSING>

---

## ../specs/tech/README.md

<MISSING>

---

## ../specs/tech/ui-domains.md

<MISSING>

---

## ../specs/tech/indexer/README.md

<MISSING>

---

## ../specs/tech/service-bundling.md

<MISSING>

---

## ../specs/tech/subsystems/subjectiv/README.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/README.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/statements.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/displayable-documents.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/statement-discovery.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/queries-and-actions.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/ui.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/nudges.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/implication-attester-ai-prompt.md

<MISSING>

---

## ../specs/tech/subsystems/lazyGiving/README.md

<MISSING>

---

## ../specs/tech/subsystems/nudger/README.md

<MISSING>

---

## ../specs/tech/subsystems/content-funding/canonicalization.md

<MISSING>

---

## ../specs/tech/subsystems/content-funding/channel-claiming.md

<MISSING>

---

## ../specs/tech/subsystems/content-funding/content-registry.md

<MISSING>

---

## ../specs/tech/subsystems/content-funding/content-attesters.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/implication-attester-ai.md

<MISSING>

---

## ../specs/tech/subsystems/fundingportals/README.md

<MISSING>

---

## ../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md

<MISSING>

---

## ../specs/tech/subsystems/content-funding/platform-api-service.md

<MISSING>

---

## ../specs/tech/subsystems/conceptspace/explorer.md

<MISSING>

---

## ../workflow/reviews/smart-contract-audit-2026-05-07.md

<MISSING>

---

## ../docs/end-user/tally/statements-and-implication-graph.md

<MISSING>

---

## ../docs/end-user/shared/key-ideas/README.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/README.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/credible-solution/README.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/credible-solution/assurance-contracts.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/credible-solution/delegation.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/getting-people-to-switch.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/hard-to-stop/README.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/hard-to-stop/credible-threat.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/so-what/README.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/so-what/enthusiastic-adoption.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/so-what/easier-than-politics.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/so-what/local-government.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/why-its-better/README.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/why-its-better/retroactive-funding.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/hard-to-stop/censorship-resistance.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/pitches.md

<MISSING>

---

## ../docs/end-user/commonality/vision-and-strategy/ethics.md

<MISSING>

---

## ../.env.example

<MISSING>

---

## ../ui/.env.example

<MISSING>