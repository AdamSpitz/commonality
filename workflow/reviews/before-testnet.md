# Big review before deploying to testnet

(Late April 2026.)

We're getting close to having enough stuff implemented that it'd make sense to deploy to a real testnet, to practice the real deployment workflow to have a shared thing that we can point at and so on.

This is a very weird experience, though, because so much of this work has been done by LLMs, and I just don't have time to look at everything myself. OTOH, that's not *that* weird; in the real world, a CEO has to decide to ship the thing even though he hasn't seen all of it; he's relying on reports from his subordinates.

So what I want to do here is do a giant test run in which we review of all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill. (That is, we're not simulating new users seeing this for the first time with no knowledge of what it is; we're coming at it as the cofounders of the project, trying to make sure that the thing actually looks like it could accomplish the purposes of the project.)

I'm expecting to find a mix of problems: blatantly-broken things, things that just don't quite make sense, things that are missing ("why don't we have a page for viewing this particular kind of data"?), etc.

For now, let's also use the `interactive-assistant` skill; I want to watch this step-by-step and get a feel for how well the ecosystem of skills is working.

## How to use this file

This single file holds the **To Do**, **Continuity** notes, and accumulated **Findings** for the whole review. Each subtask LLM should:

  - Read the most recent few continuity notes before starting.
  - Append findings to "Findings" as it goes (organized by domain — see template).
  - Update the to-do checkbox + write a continuity note when finishing.

Each subtask LLM is also doing a `subtask-doer` role and should apply both lenses while reviewing:

  - **`intelligent-tester` lens:** does it actually work? Click through it. Are there blatantly broken pages, console errors, missing data, dead links, confusing flows?
  - **`cofounder` lens:** does this surface actually accomplish what it's *supposed* to accomplish for the project? What's missing entirely? What doesn't quite make sense given what we're trying to build?

Subtask LLMs should also use `interactive-assistant` so the human can watch step by step.

## To Do

  - [ ] **Step 1 — Setup and sanity check.** Get the local stack running per README (`npm install && npm run build && ./scripts/services.sh --start && ./scripts/data.sh --seed`). Confirm all four domain SPA URLs print correctly. Open each one and confirm it at least loads without a blank page or fatal console error. Record the four URLs in the Continuity section so later subtasks can use them. If setup fails, debug or stop and surface the failure to the human — don't push ahead with a half-broken stack.

  - [ ] **Step 2 — Review the Commonality domain.** This is the biggest one (conceptspace + pubstarter + funding portals + delegation + mutable refs + trust/Subjectiv). It is large enough that this subtask should itself invoke `large-task-manager` to break it into chunks (e.g. "conceptspace pages", "pubstarter flows", "funding portals", "delegation/notes", "mutable refs", "trust/Subjectiv settings"). Append findings to the "Findings — Commonality" section.

  - [ ] **Step 3 — Review the Content Funding domain.** Walk through landing, browse-by-platform (twitter/youtube/substack), channel pages, contract creation, contract viewing, creator dashboard, attestation summaries. Append to "Findings — Content Funding".

  - [ ] **Step 4 — Review the Noninflammatory Content domain.** Landing page (the political framing!), browse, channel/contract pages, About page. Apply the cofounder lens hard here — does the framing land? Does it look like a thing a real visitor would engage with? Append to "Findings — Noninflammatory".

  - [ ] **Step 5 — Review the Common Sense Majority (Movement) domain.** Landing, organize, projects, about. Cofounder lens: does this look like a movement, or just a placeholder? Append to "Findings — Movement".

  - [ ] **Step 6 — Cross-cutting / AI-output review.** Things that span domains: are AI-generated artifacts (implication attestations, content attestations, nudges, bridge suggestions, explorer-curator collections) actually showing up in the UI in a useful way? Are seed data attestations visible? Use `cofounder` lens — would a visitor who landed on the seeded site come away thinking "this works"? Append to "Findings — Cross-cutting".

  - [ ] **Step 7 — Synthesis breakpoint (high-intelligence model).** Read all findings. Categorize: (a) blocks testnet deployment, (b) embarrassing but not blocking, (c) nice-to-have. Write a short prioritized punch list at the top of "Findings — Synthesis". This pass is where the human will likely want to look hardest.

## Continuity

(Most-recent-first. Keep it short. Older notes can be pruned.)

### 2026-04-27 — large-task-manager (Opus 4.7)
Wrote the plan above. Did not start the actual review. Step 1 (setup + sanity check) is the right next thing. Note: README warns the full test suite takes many minutes, but for *this* review we don't need to run the test suite — we need the running stack and seed data. Use `./scripts/services.sh --start` then `./scripts/data.sh --seed`, then read the printed `http://localhost:8080/ipfs/<cid>/...` URL. Re-print with `./scripts/services.sh --url`. The four domains share the SPA build but route under different paths/manifests — see `ui/src/domains/` and `specs/product/ui-domains.md` for which routes belong to which domain.

The previous status snapshot in README §"High-level overview of current status" is a good summary of what's been recently completed and worth skimming before reviewing.

## Findings

### Findings — Commonality
(empty — fill during Step 2)

### Findings — Content Funding
(empty — fill during Step 3)

### Findings — Noninflammatory
(empty — fill during Step 4)

### Findings — Movement
(empty — fill during Step 5)

### Findings — Cross-cutting
(empty — fill during Step 6)

### Findings — Synthesis
(empty — fill during Step 7)
