#!/usr/bin/env node
// verifier-go.mjs — the single "give me the verifier report" command.
//
// What it does, cheaply and idempotently:
//   1. meta.report-currency — free when HEAD hasn't moved; otherwise asks which
//      checks the new commits plausibly invalidated.
//   2. If anything is invalidated, shows a numbered list and lets you pick which
//      to re-run, interactively: type a number to toggle it, press Enter to run
//      the selected ones (press Enter with nothing selected to skip — the common
//      case, one extra keystroke).
//   3. Refreshes root, which both rolls up the dashboard and writes its
//      narrative. The rollup is always cheap; root memoizes the narrative
//      internally, so when child statuses haven't changed it reuses the prior
//      report with NO model call.
//   4. Prints (cats) the human-readable root report.md to stdout.
//
// So running it repeatedly with nothing changed spends no tokens and asks you
// nothing (one Enter). Running it after work landed offers you the exact set of
// stale checks to refresh, then regenerates the narrative over the fresh results.

import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const workspace = process.env.VERIFIER_WORKSPACE ?? "verifier";

function runCheck(id, extraEnv = {}) {
  // Inherit stdio so the user sees the check's own progress/errors live.
  const res = spawnSync("verifier-run", [id], {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  return res.status ?? 0;
}

async function latestResult(id) {
  const dir = path.join(workspace, "results", id);
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    return null;
  }
  const file = names.filter((n) => n.endsWith(".json")).sort().at(-1);
  if (!file) return null;
  return JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
}

async function catStateOfProject() {
  const result = await latestResult("root");
  if (!result) {
    console.log("\n(No report yet — root has not produced one.)");
    return;
  }
  const artifact = (result.artifacts ?? []).find(
    (a) => a.name === "report.md" || (a.path ?? "").endsWith("report.md"),
  );
  if (!artifact) {
    console.log("\n(root produced no report artifact; summary was:)", result.summary);
    return;
  }
  // Artifact paths are workspace-relative.
  const full = path.isAbsolute(artifact.path) ? artifact.path : path.join(workspace, artifact.path);
  const markdown = await fs.readFile(full, "utf8").catch(() => null);
  const ageMin = result.timestamp ? Math.floor((Date.now() - Date.parse(result.timestamp)) / 60000) : null;
  const ageNote = ageMin === null ? "" : ageMin < 60 ? ` (as of ${ageMin}m ago)` : ` (as of ${Math.floor(ageMin / 60)}h ago)`;
  console.log("\n" + "=".repeat(72));
  console.log(`STATE OF THE PROJECT${ageNote}${result.memoized ? " — reused, inputs unchanged" : ""}`);
  console.log("=".repeat(72) + "\n");
  console.log(markdown ?? "(report artifact missing on disk)");
}

// Interactive toggle loop. Returns the list of selected check ids. Resolves on a
// blank line. No raw-mode/keypress handling — line-based so it is robust in any
// terminal: type a number (or several) to toggle, blank line to finish.
function pickChecks(candidates) {
  return new Promise((resolve) => {
    const selected = new Set();
    const render = () => {
      console.log("\nChecks the commits since last time may have invalidated:");
      candidates.forEach((c, i) => {
        const mark = selected.has(i) ? "[x]" : "[ ]";
        console.log(`  ${mark} ${i + 1}. ${c.checkId}  (${c.severity ?? "?"})`);
        if (c.reason) console.log(`         ${c.reason}`);
      });
      console.log("\nType a number to toggle it; press Enter on a blank line to re-run the selected ones (Enter now = skip all).");
    };
    render();
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt("> ");
    rl.prompt();
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed === "") {
        rl.close();
        resolve([...selected].map((i) => candidates[i].checkId));
        return;
      }
      for (const tok of trimmed.split(/[\s,]+/)) {
        const n = Number(tok);
        if (Number.isInteger(n) && n >= 1 && n <= candidates.length) {
          const idx = n - 1;
          if (selected.has(idx)) selected.delete(idx);
          else selected.add(idx);
        } else {
          console.log(`  (ignored "${tok}": enter a number 1-${candidates.length})`);
        }
      }
      render();
      rl.prompt();
    });
  });
}

async function main() {
  // 1. Currency: free when HEAD hasn't moved.
  console.log("Checking report currency (free if no new commits since last time)...");
  runCheck("meta.report-currency");
  const currency = await latestResult("meta.report-currency");
  const invalidated = currency?.findings?.invalidatedChecks ?? [];

  // 2. Offer to refresh the invalidated checks.
  if (invalidated.length > 0 && process.stdin.isTTY) {
    const chosen = await pickChecks(invalidated);
    if (chosen.length === 0) {
      console.log("\nSkipping re-runs; the report will note these as not-yet-refreshed.");
    } else {
      for (const id of chosen) {
        console.log(`\n--- re-running ${id} ---`);
        runCheck(id);
      }
    }
  } else if (invalidated.length > 0) {
    console.log(`\n${invalidated.length} check(s) may be stale: ${invalidated.map((c) => c.checkId).join(", ")}`);
    console.log("(non-interactive stdin; not prompting. Re-run them with verifier-run <id>.)");
  } else {
    console.log("Report is current — no commits have invalidated any check.");
  }

  // 3. Refresh the dashboard rollup and its narrative — both are `root` now.
  //    root memoizes the narrative internally, so this is free (no model call)
  //    when the child statuses and milestone are unchanged.
  runCheck("root");

  // 4. Show the human-readable report.
  await catStateOfProject();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
