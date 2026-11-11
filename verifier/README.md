# Commonality verifier workspace

We wrote an external harness called `verifier` (it's a separate standalone npm package called `@adamspitz/verifier`) meant to be used to run various "checks" on a project. This directory is the "verifier workspace" for using that harness on the Commonality project.

For more info:
  - [how to run it](./HOW-TO-RUN-IT.md)
  - [why it's built this way](./DESIGN.md)
  - [improvement backlog](./PLAN.md)
  - see the `using-verifier` AI skill for the underlying harness model
  - see the `*.def.json` files under [`checks/`](./checks/) for the source of truth regarding how particular checks work.

## Short list of most common things you might want to do

TODO: put the short list here, do NOT let this file get too cluttered.
