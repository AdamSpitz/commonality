# Build Process

This file is the durable overview of how builds work in this repo today, what was recently improved, and what remains to be done.

For end-user local-dev commands, see [README.md](README.md) and [deployment.md](deployment.md). This file is specifically about build/test orchestration and Docker image rebuild behavior.

## Overview

There are two separate build layers:

1. Workspace builds on the host, orchestrated by `turbo`.
2. Docker image builds for local services and some tests, orchestrated by `docker compose` plus `scripts/docker-build-plan.mjs`.

The recent build-process work was about making both layers smarter about reusing previous work without falling back into the old problem of reusing stale outputs when inputs really changed.

## Workspace Builds

Root scripts in [package.json](/home/adam/Projects/commonality/package.json) now run through `turbo` instead of broad `npm run ... --workspaces` fan-out:

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run clean`

The task graph is defined in [turbo.json](/home/adam/Projects/commonality/turbo.json).

Current intent:

- `build` depends on upstream workspace `build` tasks via `^build`.
- `typecheck` depends on upstream `build` tasks, so packages can type-check against current built dependencies.
- `test` depends on both the local package build and upstream builds.
- Task outputs are declared so Turbo can skip or replay work when inputs and outputs are unchanged.

The previous redundant SDK rebuild hooks were removed from SDK-dependent leaf workspaces, so downstream packages are no longer repeatedly rebuilding the same upstream packages in their `prebuild` / `pretypecheck` steps.

## Docker Image Rebuilds

Local service startup and integration tests do not blindly rebuild every compose image anymore.

Instead, [scripts/docker-build-plan.mjs](/home/adam/Projects/commonality/scripts/docker-build-plan.mjs) computes hashes for each buildable service from a declared set of inputs and compares them against:

- the last recorded hash in `.cache/docker-build-state.json`
- whether the tagged Docker image already exists locally

If the image is missing, or the declared inputs changed, that service gets rebuilt. Otherwise the existing image is reused.

The planner currently knows about these build keys:

- `hardhat-deploy`
- `indexer`
- `platform-api-service`
- `ui-ipfs-publisher`

Some compose services intentionally share a single image/build key:

- all four UI IPFS publisher services share `commonality-ui-ipfs-publisher:dev`
- the planner deduplicates them by `buildKey`, so identical builds happen once

Compose also uses explicit image names so services with identical build definitions can share the same built image instead of rebuilding equivalent images under separate compose-generated tags.

## What Counts As A Docker Build Input

The planner hashes only declared inputs for each image, not the whole repo.

That is the main protection against unrelated repo changes invalidating every image build. For example, the root-context Docker builds now include only the workspace manifests and source trees they actually need, rather than copying the whole repo into the build context in a way that makes unrelated edits bust the cache.

The planner also ignores things that should not force rebuilds, including:

- `node_modules`
- `dist`
- coverage/test artifacts
- `.cache`, `.turbo`, `.git`
- `.env*`
- Markdown files

Ignoring Markdown is intentional for build speed, but it means documentation-only changes do not trigger image rebuilds. If a doc change describes a required build change, the actual Dockerfile/script inputs still need to change.

## Where The Planner Is Used

### Local dev services

[scripts/services.sh](/home/adam/Projects/commonality/scripts/services.sh) uses the planner before `docker compose up` for these services:

- `hardhat-deploy`
- `indexer`
- `platform-api-service`
- all four `ui-ipfs-publisher-*` services

If nothing relevant changed, `./scripts/services.sh --start` reuses the existing images.

### Integration tests

[scripts/run-integration-tests.sh](/home/adam/Projects/commonality/scripts/run-integration-tests.sh) uses the same planner, but only for the services integration tests actually need:

- `hardhat-deploy`
- `indexer`
- `platform-api-service`

It still starts from a clean ephemeral data directory at `/tmp/commonality-it`, but it no longer has to rebuild every image each time.

The script also builds the SDK on the host first because the integration tests consume the workspace output directly.

## Dockerfile Caching And Runtime Permissions

Recent Dockerfile changes were aimed at making rebuilds cheaper and runtime behavior less sloppy:

- The compose-built Node images now use BuildKit npm cache mounts on dependency-install layers where supported.
- The UI and hardhat images now grant write access only to the runtime output paths they actually need, instead of broadly opening the whole work tree.
- Root-context images copy only the manifests and workspace trees they actually require, reducing cache invalidation from unrelated changes elsewhere in the repo.

Relevant Dockerfiles include:

- [ui/Dockerfile](/home/adam/Projects/commonality/ui/Dockerfile)
- [hardhat/Dockerfile](/home/adam/Projects/commonality/hardhat/Dockerfile)
- [indexer/Dockerfile](/home/adam/Projects/commonality/indexer/Dockerfile)
- [platform-api-service/Dockerfile](/home/adam/Projects/commonality/platform-api-service/Dockerfile)
- [content-attester/Dockerfile](/home/adam/Projects/commonality/content-attester/Dockerfile)
- [implication-graph-nudger/Dockerfile](/home/adam/Projects/commonality/implication-graph-nudger/Dockerfile)

## Current Build Workflow

### Common development loop

```bash
npm install
npm run build
./scripts/services.sh --start
./scripts/data.sh --seed
```

Notes:

- `npm run build` is the host-side workspace build/type output path.
- `./scripts/services.sh --start` handles Docker image reuse/rebuild decisions for local services.
- `./scripts/data.sh --seed` populates the local chain after the services are up. It fails if the indexer already has event data; wipe first for a clean reset, or pass `--allow-seed-on-existing-data` if you intentionally want to layer another seed run onto existing data.

### Common verification commands

- `npm run lint`
- `npm run build`
- `npm run test`
- `./scripts/run-integration-tests.sh`

The Git pre-commit hook also runs the build and tests, so if commit-readiness is the main question, using the hook is often enough.

## Relationship To Other Docs

- [README.md](/README.md) is the quick-start and repo map.
- [deployment.md](./deployment.md) covers testnet/mainnet deployment (Render blueprint, contract deployment, IPFS + ENS). Local-dev commands including `scripts/services.sh` are in [README.md](/README.md).
- This file is the durable explanation of the build system itself.

## Remaining Build Follow-up

The main known follow-up item is:

- If we start commonly launching the attesters or nudger directly outside `scripts/services.sh`, either route those flows through the same planner or clearly document a `docker compose build <service>` convention for them.

At the moment, the planner-backed path is well documented for:

- normal local development via `./scripts/services.sh --start`
- integration tests via `./scripts/run-integration-tests.sh`

It is not yet the documented universal rule for every service-oriented workflow in the repo.
