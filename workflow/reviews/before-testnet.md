# Big review before deploying to testnet

(Late April 2026.)

The goal here is to do a giant test run in which we review of all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

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

---

## To Do

- [x] Run full automated test suite (test:fast + full E2E)
- [x] Review project structure, specs, and implementation status
- [x] Assess AI service ecosystem (attesters, finders, nudgers, explorer)
- [x] Review SDK completeness
- [x] Review smart contract structure
- [x] Review UI surfaces (pages, domains, routing)
- [x] Review deployment configuration
- [x] Check for stale documentation vs. actual implementation
- [x] Assess overall readiness for testnet

---

## Continuity

**2026-04-29 — High-level test completed.**

Comprehensive review of the entire project was performed by a single LLM instance (cofounder + noninteractive-assistant + intelligent-tester). Key actions taken:

1. Read project README, specs, CONTINUITY.md, TODO.md
2. Ran `npm run test:fast` — all 1567 tests across 85 files passed
3. Ran `npm run test` (full E2E suite) — all 25/25 Playwright tests passed (~2.8 min)
4. Ran `npm run build` — all 18 tasks successful
5. Reviewed all subsystem README files (attesters, finders, nudgers, explorer, SDK, hardhat, UI)
6. Reviewed key specs (MVP, new-user-experience, explorer, nudge-ux)
7. Audited source code for TODOs/FIXMEs, console logs, debug artifacts
8. Inspected docker-compose.yml for service configuration
9. Reviewed UI pages, env configuration, deployment setup

Findings recorded below. No code changes were made — this was a read-only review.

---

## Findings

### Overall Test Results

**Status: All automated tests pass.**

- `npm run test:fast`: 1567 tests, 85 files — ALL PASS
- `npm run test` (full E2E with Docker): 25/25 Playwright tests — ALL PASS
  - belief-expression, browse-statements, content-funding-flow, delegation-flow, negative-paths, pubstarter-flow, statement-creation (form + flow), subjectiv-flow, user-profile, wallet-connection
- `npm run build`: All 18 tasks successful

The project is in good automated-test health. No blatantly broken code paths detected by the test suite.

---

### Finding 1: AI Worker Services DISABLED by Default in Local Dev

**Severity: Medium-High**
**Domain: AI Service Ecosystem / Docker Configuration**

In `docker-compose.yml`, the `service-host-workers` bundle has ALL worker services disabled:

```
IMPLICATION_FINDER_ENABLED=false
CONTENT_FINDER_ENABLED=false
IMPLICATION_GRAPH_NUDGER_ENABLED=false
BRIDGE_CREATOR_ENABLED=false
EXPLORER_CURATOR_ENABLED=false
```

Only the attester bundle (`service-host-attesters`) is enabled by default. This means:
- **Implication Finder** (discovers statement pairs for attestation) — OFF
- **Content Finder** (processes content submission queue) — OFF
- **Implication Graph Nudger** (suggests statements based on implication graph) — OFF
- **Bridge Creator** (synthesizes common-ground statements) — OFF
- **Explorer Curator** (maintains curated collection for explorer) — OFF

**Impact:** A developer running `./scripts/services.sh --start` gets a partially-functional AI ecosystem. The attesters work (can evaluate implications on demand), but the proactive discovery and suggestion services don't run. The Explorer page will show "No curated collection available" because the explorer-curator isn't running.

**Cofounder assessment:** This is probably intentional for local dev (no need to burn OpenRouter API credits on background processes). But it means the *actual* first-run experience for a new developer doesn't show the full system working. The "no curated collection" empty state in Explorer is the default experience, not the intended experience.

**Recommendation:** Add clear documentation that workers are disabled by default and how to enable them. Consider whether the `--seed` script should also spin up a minimal worker cycle to populate some initial data.

HUMAN'S NOTE: Let's talk this out interactively. I wonder whether we can run the LLM *once* and then cache the results, rather than running them every time we run the tests. We already have some stuff that works like that, don't we?

AFTER TALKING ABOUT IT: Discussed. Plan: extend the existing pre-generated-evaluations pattern to cover explorer curator, nudgers, and implication finder outputs. Pre-generate against the seed statements (stable CIDs), store as checked-in JSON, replay on-chain during seeding — no live LLM calls needed. See `specs/dev/testing/pregenerated-worker-outputs.md` and TODO.md.

---

### Finding 4: Console Debug Logging in Production UI Code

**Severity: Low**
**Domain: UI Polish**

Several `console.log` statements exist in production UI code (not test files):

- `ui/src/conceptspace/components/CreateStatementForm.tsx`: 5 console.log statements (lines 99, 102, 105, 110)
- `ui/src/conceptspace/pages/StatementPage.tsx`: 1 console.log (line 67)

No `alert()`, `prompt()`, or `confirm()` calls were found — good, proper UI modals are used instead.

**Impact:** Minor — console.log is invisible to end users but adds noise in browser dev tools.

**Recommendation:** Remove or convert to proper logging utility that can be disabled in production.

HUMAN'S NOTE: Remove if unimportant, convert to proper logging if important.

---

### Finding 8: Seed Content Coverage

**Severity: Medium**
**Domain: First-Run Experience**

The TODO.md notes: "Make sure the seed content gets into the fake universe simulation."

From the continuity notes, fake-data generation seeds 10 users and 3 rounds of data. However:
- The Explorer's curated collection requires the explorer-curator to run (disabled by default — Finding 1)
- Without seed content in the explorer's collection, the Explorer page shows empty state
- Without finders running, no implication pairs are discovered for nudging

**Impact:** A developer or tester running the default local setup gets a sparse experience — statements exist but the AI-driven discovery and suggestion layers are empty.

**Recommendation:** Consider running a one-shot seed cycle that populates initial curated collections and implication pairs, even if the continuous workers are disabled.

HUMAN'S NOTE: Yes. Let's make sure we have an easy command for doing this.

---

### Finding 11: Smart Contracts — No Audit Since Last Changes

**Severity: Medium-High**
**Domain: Smart Contracts**

TODO.md lists: "Do another smart-contract audit pass."

The project has never been deployed to mainnet. The smart contracts include:
- 28 Solidity files across 6 domains
- Complex delegation logic (DelegatableNotes, NoteIntent)
- ERC-1155 primary + secondary markets
- Content funding with channel verification

**Cofounder assessment:** Before testnet deployment, at minimum a fresh review of the most complex contracts (DelegatableNotes, AssuranceContract, ChannelEscrow) is warranted. The TODO.md notes this is "(Not a task for AI)" — the founder wants to do this personally.

**Recommendation:** Don't deploy to testnet without at least a targeted review of the high-risk contracts.

HUMAN'S NOTE: Yes, I do want to do this. I'm not too worried about testnet because it's testnet, but yes, let's do our best to satisfy ourselves that it's not just broken before we ship it even to testnet.
