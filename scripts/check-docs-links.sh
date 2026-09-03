#!/usr/bin/env bash
# Validate links across the project's prose docs: relative file links plus
# root-absolute links, which resolve against the repo root. External (http),
# mailto, and SPA-only routes are ignored via .markdown-link-check.json.
# Run from anywhere.
#
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

npx --no-install markdown-link-check \
  specs docs/end-user docs/founder docs/dev workflow \
  README.md AGENTS.md CLAUDE.md TODO.md CONTINUITY.md testnet-prep.md inbox.md \
  --config .markdown-link-check.json \
  --projectBaseUrl "file://$ROOT" \
  --quiet
