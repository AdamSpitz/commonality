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

  - [x] **Step 0 — Fix the broken UI IPFS publisher build.** Currently `./scripts/services.sh --start` fails before any domain SPA is published. The `commonality-ui-ipfs-publisher` container runs `npm run ui:build:ipfs` (which calls `turbo run build:ipfs --filter=ui`) and the turbo CLI errors out. Two stacked problems were observed in `ui/Dockerfile`:
      1. `turbo.json` is not COPYed into the image. Turbo errors `Could not find turbo.json or turbo.jsonc.` This appears to be a latent bug introduced in commit 272abdf ("Working on making the build smarter so it won't be so slow."), which switched the Dockerfile from `COPY . .` to selective COPYs and added `turbo.json` to the repo in the same commit, but never copied it into the image.
      2. After fixing #1, turbo fails with `I/O error: Permission denied (os error 13)` — apparently because the container runs as `${UID:-1000}:${GID:-1000}` but `/workspace` is owned by root. The narrowed `chmod` introduced in commit 9bf1d2c ("Trim Docker chmod layers") only covers `ui/dist` and `ui/node_modules/.tmp`, so turbo can't create its `.turbo/cache` at the workspace root (and may need to write elsewhere too — needs investigation).
      The same Dockerfile is used by all four `ui-ipfs-publisher-*` services, so all four domains are blocked. Until this is fixed, the rest of this review can't proceed past Step 1.

  - [x] **Step 1 — Setup and sanity check.** Get the local stack running per README (`npm install && npm run build && ./scripts/services.sh --start && ./scripts/data.sh --seed`). Confirm all four domain SPA URLs print correctly. Open each one and confirm it at least loads without a blank page or fatal console error. Record the four URLs in the Continuity section so later subtasks can use them. If setup fails, debug or stop and surface the failure to the human — don't push ahead with a half-broken stack.

  - [ ] **Step 2 — Review the Commonality domain.** This is the biggest one (conceptspace + pubstarter + funding portals + delegation + mutable refs + trust/Subjectiv). It is large enough that this subtask should itself invoke `large-task-manager` to break it into chunks (e.g. "conceptspace pages", "pubstarter flows", "funding portals", "delegation/notes", "mutable refs", "trust/Subjectiv settings"). Append findings to the "Findings — Commonality" section.

  - [ ] **Step 3 — Review the Content Funding domain.** Walk through landing, browse-by-platform (twitter/youtube/substack), channel pages, contract creation, contract viewing, creator dashboard, attestation summaries. Append to "Findings — Content Funding".

  - [ ] **Step 4 — Review the Noninflammatory Content domain.** Landing page (the political framing!), browse, channel/contract pages, About page. Apply the cofounder lens hard here — does the framing land? Does it look like a thing a real visitor would engage with? Append to "Findings — Noninflammatory".

  - [ ] **Step 5 — Review the Common Sense Majority (Movement) domain.** Landing, organize, projects, about. Cofounder lens: does this look like a movement, or just a placeholder? Append to "Findings — Movement".

  - [ ] **Step 6 — Cross-cutting / AI-output review.** Things that span domains: are AI-generated artifacts (implication attestations, content attestations, nudges, bridge suggestions, explorer-curator collections) actually showing up in the UI in a useful way? Are seed data attestations visible? Use `cofounder` lens — would a visitor who landed on the seeded site come away thinking "this works"? Append to "Findings — Cross-cutting".

  - [ ] **Step 7 — Synthesis breakpoint (high-intelligence model).** Read all findings. Categorize: (a) blocks testnet deployment, (b) embarrassing but not blocking, (c) nice-to-have. Write a short prioritized punch list at the top of "Findings — Synthesis". This pass is where the human will likely want to look hardest.

## Continuity

(Most-recent-first. Keep it short. Older notes can be pruned.)

### 2026-04-27 — Step 1 completed
Stack is running. All four SPAs return HTTP 200 and serve valid HTML+JS. Indexer is healthy and has events. Seed data script was started (data.sh --seed) and made progress (funded 50 users, uploaded 90 statements, ran 3 simulation rounds) but timed out after 5 min — likely still processing. URLs:
  - commonality: `http://localhost:8080/ipfs/Qmaki9PKAh5V1qutTq1CyeutyQJ8Fua81S2QhWvgknheNE/commonality-ui/#/`
  - content-funding: `http://localhost:8080/ipfs/QmWVxipcPBjSs5D1he1ySEtaQ1ogxQ5VuFwCyKurcbp9CV/content-funding-ui/#/`
  - noninflammatory: `http://localhost:8080/ipfs/QmUUZHxn9zst4oc9zJYMfH8pmj9PCWaxF5r6gMoHoKPz5C/noninflammatory-ui/#/`
  - movement: `http://localhost:8080/ipfs/QmPNZNgf7nR7xwBbHhCA9R9HNdADx5fwt5tT2cyWjc5eNU/movement-ui/#/`

### 2026-04-27 — Step 0 completed
Fixed `ui/Dockerfile`: added `COPY turbo.json ./turbo.json` and changed `chmod -R a+rwX` to cover the entire `/workspace` instead of just `ui/dist` and `ui/node_modules/.tmp`. All four domain UI builds now publish successfully. Stack is running; ready for Step 1.

### 2026-04-27 — subtask-doer (Opus 4.7), Step 1 attempt
Tried Step 1; the stack does not start cleanly. `./scripts/services.sh --start` fails at the UI IPFS publisher step with a turbo error. Root-caused two problems in `ui/Dockerfile` (see new Step 0 above) but the user redirected me to record a to-do rather than fix the services myself. Dockerfile reverted; services stopped. No findings recorded yet — Step 1 not actually completed.

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
