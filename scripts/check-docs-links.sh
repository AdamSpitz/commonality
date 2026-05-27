#!/usr/bin/env bash
# Validate links in the end-user docs (relative file links, plus root-absolute
# /docs and /specs links). External (http) links and SPA-only routes are
# ignored via .markdown-link-check.json. Run from anywhere.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

npx --no-install markdown-link-check docs/end-user docs/founder \
  --config .markdown-link-check.json \
  --projectBaseUrl "file://$ROOT" \
  --quiet
