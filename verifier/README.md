# Commonality verifier workspace

We wrote an external harness called `verifier` (it's a separate standalone npm package called `@adamspitz/verifier`) meant to be used to run various "checks" on a project. This directory is the "verifier workspace" for using that harness on the Commonality project.

For more info:
  - [how to run it](./HOW-TO-RUN-IT.md)
  - [why it's built this way](./DESIGN.md)
  - [improvement backlog](./PLAN.md)
  - see the `using-verifier` AI skill for the underlying harness model
  - see the `*.def.json` files under [`checks/`](./checks/) for the source of truth regarding how particular checks work.

## Short list of most common things you might want to do

- `npm run verifier:tree` — TUI. The default **Leaf checks** tab is a flat list of every leaf check (failing first, then code-changed-since-run, then never-run, then passing), so one broken subcheck doesn't paint a whole rollup red. The **All checks** tab still shows the full DAG.
- `npm run verifier:brief` — prints a prompt (every leaf's status/age/cost/summary + last 14 days of git log) asking an LLM for a cheap, no-deep-investigation "what's going on and what next" read. Pipe or paste it into any LLM (or just ask the chat LLM to run it and answer).
