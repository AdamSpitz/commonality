import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { emit, pass, uncertain, workspacePath } from "../lib/result.mjs";
import { discoverTypeScriptSourceRoots } from "./circular-deps-workspaces.mjs";

const run = promisify(execFile);

// Repo root is one level above the verifier workspace.
const repoRoot = path.resolve(workspacePath(".."));

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
  const discovery = discoverTypeScriptSourceRoots(repoRoot);
  const roots = discovery.roots;
  const perRoot = [];
  const errors = [...discovery.errors];
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
    discoveredWorkspaces: roots.length + discovery.skipped.length + discovery.errors.length,
    scannedRoots: roots.length,
    skippedWorkspaces: discovery.skipped,
    totalCycles,
    cyclesByRoot: perRoot,
    ...(errors.length > 0 ? { unscannableWorkspaces: errors } : {}),
  };

  // Advisory: a scan error means we could not judge, not that anything is wrong.
  if (errors.length > 0) {
    return uncertain(
      `Could not discover or scan ${errors.length} workspace(s); ${roots.length - (errors.length - discovery.errors.length)} source root(s) scanned.`,
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
