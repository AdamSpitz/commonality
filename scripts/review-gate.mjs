#!/usr/bin/env node
// Review-gate referee.
//
// Tool-agnostic enforcement of the "a review actually happened" rule. This
// script runs NO LLM and needs NO API key beyond the GitHub token that Actions
// already provides. It only asks a factual question about the PR:
//
//   Does a submitted PR review exist whose body carries the trailer
//     Reviewed-commit: <current head sha>
//
// ...and reports the answer as a commit status named `review-received`, which
// branch protection on `dev` requires to be green before merge.
//
// Because the check is just "a receipt exists for this exact commit", ANY
// reviewer can satisfy it — Claude Code (`/code-review --comment`), pi, or a
// human — as long as they post the review via scripts/post-review.sh (or an
// equivalent that includes the trailer). Pushing new commits invalidates the
// old receipt (the sha changes), so the gate re-arms automatically.
//
// The companion "block on findings, force resolve" half is handled by GitHub's
// native `required_conversation_resolution` — findings are posted as review
// threads, and you can't merge until each is resolved. This script does not
// need to look at findings at all.
//
// Usage: node scripts/review-gate.mjs   (reads the Actions event from
// GITHUB_EVENT_PATH; falls back to PR_NUMBER env for manual runs.)

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const STATUS_CONTEXT = "review-received";
const TRAILER = /^Reviewed-commit:\s*([0-9a-f]{7,40})\s*$/im;
// Review receipts are required on the way INTO these branches.
const GATED_BASE = "dev";
const RELEASE_BASE = "master";
// One exemption: a release PR (dev -> master) is a rubber-stamp of content that
// already passed the gate on its way into dev, so it needs no fresh receipt.
// Anything ELSE aimed at master — a hotfix branch, say — is treated exactly like
// a PR into dev: land it directly and quickly, but carry a receipt. That keeps
// the isolated hotfix path open while closing the bypass that let unreviewed
// feature branches merge straight into the release branch.
const RELEASE_HEAD = "dev";

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) fail("GITHUB_REPOSITORY is not set");

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

function fail(msg) {
  console.error(`review-gate: ${msg}`);
  process.exit(1);
}

// --- Resolve the PR we're gating ---------------------------------------------

function loadEvent() {
  const path = process.env.GITHUB_EVENT_PATH;
  if (path) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      fail(`could not read GITHUB_EVENT_PATH: ${err.message}`);
    }
  }
  return {};
}

const event = loadEvent();
const prNumber =
  event.pull_request?.number ??
  event.number ??
  (process.env.PR_NUMBER ? Number(process.env.PR_NUMBER) : undefined);

if (!prNumber) fail("could not determine the PR number");

// Always re-fetch the PR so we act on the current head sha, not a stale payload.
const pr = JSON.parse(
  gh([
    "api",
    `repos/${repo}/pulls/${prNumber}`,
    "--jq",
    "{headSha: .head.sha, base: .base.ref, head: .head.ref, headRepo: .head.repo.full_name}",
  ]),
);
const headSha = pr.headSha;
const baseRef = pr.base;
const headRef = pr.head;

// --- Releases are exempt; everything else aimed at a gated base needs a receipt

// Same-repo only: a fork branch named `dev` is not our dev.
if (baseRef === RELEASE_BASE && headRef === RELEASE_HEAD && pr.headRepo === repo) {
  setStatus(headSha, "success", `Release from '${RELEASE_HEAD}' — already reviewed on the way in`);
  console.log(`review-gate: release PR from '${RELEASE_HEAD}' — passing.`);
  process.exit(0);
}

// --- Non-gated bases pass trivially ------------------------------------------

if (baseRef !== GATED_BASE && baseRef !== RELEASE_BASE) {
  setStatus(headSha, "success", `Not gated (base is '${baseRef}')`);
  console.log(`review-gate: base '${baseRef}' is not gated — passing.`);
  process.exit(0);
}

// --- Look for a receipt tied to this exact head sha --------------------------

const reviews = JSON.parse(
  gh(["api", `repos/${repo}/pulls/${prNumber}/reviews`, "--paginate", "--jq", "[.[] | {body: .body, commitId: .commit_id, state: .state}]"]),
);

const receipt = reviews.find((r) => {
  if (r.state === "PENDING") return false;
  const match = (r.body || "").match(TRAILER);
  if (!match) return false;
  return headSha.startsWith(match[1]);
});

if (receipt) {
  setStatus(headSha, "success", "Review received for this commit");
  console.log(`review-gate: receipt found for ${headSha.slice(0, 12)} — passing.`);
} else {
  setStatus(
    headSha,
    "failure",
    "No review posted for this commit — run scripts/post-review.sh",
  );
  console.log(
    `review-gate: no receipt for ${headSha.slice(0, 12)}. ` +
      `Review the diff and post via scripts/post-review.sh (any agent).`,
  );
  process.exit(1);
}

// --- Status helper -----------------------------------------------------------

function setStatus(sha, state, description) {
  const runUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined;
  const args = [
    "api",
    "-X",
    "POST",
    `repos/${repo}/statuses/${sha}`,
    "-f",
    `state=${state}`,
    "-f",
    `context=${STATUS_CONTEXT}`,
    "-f",
    `description=${description.slice(0, 140)}`,
  ];
  if (runUrl) args.push("-f", `target_url=${runUrl}`);
  gh(args);
}
