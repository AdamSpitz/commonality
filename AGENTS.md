# AGENTS.md

## Get acquainted with the project

Please read the project's README.md. Follow the role-routing in "Finding relevant specs" for your task. Do NOT broadly explore specs/ — most of it won't be relevant to you.

## Local data

It is fine to wipe local dev data (`./scripts/data.sh --wipe`) unless the user explicitly says otherwise. Local chain state, Ponder DB, and IPFS data are all ephemeral by design.

## Shell commands

Prefer writing scripts to files and executing them over inline multi-line -e strings.
Avoid heredocs or embedded newlines in shell commands.
Write temporary debug scripts to `tmp/` and clean them up when done.
