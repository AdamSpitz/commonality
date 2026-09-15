# Verifier operator overhaul

## Outcome

The verifier should answer an operator's question without requiring them to
understand its 148-check implementation graph. The check DAG remains the source
of truth; a project-owned operator layer presents it through three intentions:

1. **Check my current work** — inspect committed and uncommitted changes,
   explain which evidence they invalidate, and run only the safe, cheap subset
   by default.
2. **Tell me where we stand** — read stored evidence without causing work or
   spending tokens.
3. **Prepare for a milestone** — preview a named evidence campaign, including
   time, prerequisites, and side effects, before explicitly running it.

The raw tree and individual `verifier-run` commands remain available as an
advanced/debugging interface.

## Design principles

- Keep stable check IDs; add human labels and views separately.
- Show conclusions and problems by default. Collapse supervisors, coverage
  bookkeeping, and `known-bad.*` fixtures.
- Describe cost on independent axes: expected wall time, LLM use,
  prerequisites, and effects such as wiping local data or writing to testnet.
- Automatically run only deterministic, short, side-effect-free checks.
- Invalidate evidence deterministically from changed paths. Use LLM judgment
  only as an explicitly requested fallback for paths the policy cannot map.
- Compare changes with the baseline recorded for each check by the operator
  layer. Include the dirty working tree. Never silently treat a missing or
  rewritten baseline as proof that evidence is current.
- Use `focus.md` to select the default working view. Time-based freshness is
  primarily for externally drifting systems, not unchanged source evidence.

## Implementation

The operator policy is [`operator-policy.json`](./operator-policy.json). It is
data rather than code so labels, views, path ownership, costs, and milestone
campaigns can be reviewed together.

The entry point is `scripts/verifier-operator.mjs`:

```sh
npm run verifier:work
npm run verifier:stand
npm run verifier:prepare -- testnet-simulation
```

`work` calculates changed paths from Git plus the dirty tree, maps them through
the policy, previews aggregate cost/effects, runs only checks marked `autoSafe`,
and records per-check Git and dependency fingerprints after successful runs.
Use `--all` to include suggested non-automatic checks, or `--dry-run` to inspect
the decision only.

`stand` is strictly read-only. It presents the focus, key conclusions, current
problems, evidence age, and recorded runtime without refreshing checks.

`prepare` previews a milestone campaign. It runs nothing unless `--run` is
given. Guarded checks retain their existing environment-variable opt-ins, so
`--run` cannot bypass destructive/testnet protections.

The older `meta.report-currency` remains available as
`npm run verifier:currency:heuristic`, but is no longer part of the normal
operator path. Its limitations are explicit: it sees commit subjects and file
statistics rather than diffs, misses dirty changes, uses a shared watermark,
and may re-baseline after rewritten history.

## Rollout and acceptance criteria

### Phase 1 — operator interface and honest costs

- The commands menu exposes the three intentions first.
- Stored status is readable with no model call or check execution.
- Every check shown by the operator has an effects/prerequisites/runtime
  estimate, using measured duration when results provide one.

### Phase 2 — deterministic invalidation

- Common source areas map to relevant leaf checks in policy.
- Dirty files participate in invalidation.
- Unmapped paths are reported rather than guessed away.
- Successful operator-triggered runs store a per-check baseline.

### Phase 3 — human views

- The default view follows `focus.md`.
- Problems and milestone evidence are available without browsing internal
  supervisor/fixture topology.
- Human labels explain the conclusion while stable IDs remain visible for
  debugging.

### Phase 4 — tuning

- Replace static duration estimates with rolling observed durations wherever
  the harness exposes them.
- Expand path ownership when an unmapped change is encountered.
- After real usage, remove redundant commands and checks rather than guessing
  which checks are redundant up front.

