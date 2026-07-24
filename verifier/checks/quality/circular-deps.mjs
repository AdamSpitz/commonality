import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { emit, pass, uncertain, workspacePath } from "../lib/result.mjs";

const run = promisify(execFile);

// Repo root is one level above the verifier workspace.
const repoRoot = path.resolve(workspacePath(".."));

// Code-heavy TypeScript workspaces we care about keeping acyclic. Add new
// workspaces here as they appear; missing dirs are skipped silently.
const SOURCE_ROOTS = [
  "sdk/src",
  "ui/src",
  "indexer/src",
  "attester-core/src",
  "finder-core/src",
  "nudger-core/src",
  "content-attester/src",
  "content-finder/src",
  "implication-attester/src",
  "implication-finder/src",
  "implication-graph-nudger/src",
  "bridge-creator/src",
  "explorer-curator/src",
  "beat-agent/src",
  "beat-memory/src",
  "service-host/src",
  "platform-api-service/src",
  "integration-tests/src",
];

async function findCycles(root) {
  // madge exits non-zero when it finds cycles, so tolerate a non-zero code and
  // read stdout regardless.
  try {
    const { stdout } = await run(
      "npx",
      ["madge", "--circular", "--extensions", "ts,tsx", "--json", root],
      { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 }
    );
    return { cycles: JSON.parse(stdout || "[]") };
  } catch (error) {
    // A non-zero exit with parseable JSON on stdout is the "cycles found" path.
    if (error?.stdout) {
      try {
        return { cycles: JSON.parse(error.stdout) };
      } catch {
        /* fall through to error report */
      }
    }
    return { error: error?.message ?? String(error) };
  }
}

emit(async () => {
  const roots = SOURCE_ROOTS.filter((r) => existsSync(path.join(repoRoot, r)));
  const perRoot = [];
  const errors = [];
  let totalCycles = 0;

  for (const root of roots) {
    const { cycles, error } = await findCycles(root);
    if (error) {
      errors.push({ root, error });
      continue;
    }
    if (cycles.length > 0) {
      totalCycles += cycles.length;
      perRoot.push({ root, cycleCount: cycles.length, cycles });
    }
  }

  const findings = {
    scannedRoots: roots.length,
    totalCycles,
    cyclesByRoot: perRoot,
    ...(errors.length > 0 ? { scanErrors: errors } : {}),
  };

  // Advisory: a scan error means we could not judge, not that anything is wrong.
  if (errors.length > 0 && perRoot.length === 0) {
    return uncertain(
      `madge could not scan ${errors.length} of ${roots.length} source root(s); no cycles observed in the rest.`,
      { findings }
    );
  }
  if (totalCycles > 0) {
    return uncertain(
      `Found ${totalCycles} circular import cycle(s) across ${perRoot.length} workspace(s). Advisory — review layering.`,
      { findings }
    );
  }
  return pass(`No circular import cycles across ${roots.length} scanned workspace source root(s).`, {
    findings,
  });
});
