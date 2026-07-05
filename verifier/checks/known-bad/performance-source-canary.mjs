import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for operations.performance-source-canary. Proves
// the static source scan can (a) pass a clean tree, (b) reject an oversized
// source file, and (c) reject synchronous localStorage/sessionStorage access in
// a page/component render path — without depending on the real UI source tree.

const TARGET_SCRIPT = "checks/operations/performance-source-canary.mjs";

function runTarget(inputs, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", [TARGET_SCRIPT], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(inputs),
        ...extraEnv
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ error, stdout, stderr, exitCode: null }));
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
  });
}

function parseSingleResult(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length !== 1) throw new Error(`Target emitted ${lines.length} stdout line(s), expected exactly one JSON Result.`);
  const result = JSON.parse(lines[0]);
  if (!result || typeof result.status !== "string" || typeof result.summary !== "string") {
    throw new Error("Target stdout was JSON but not a verifier Result with status and summary.");
  }
  return result;
}

function paramsInput(data) {
  return [{ kind: "params", data }];
}

// Build a minimal source tree under `<case>/src/pages/`. The check's render-risk
// scan only flags files whose repo-root-relative path contains `src/.../pages/`
// or `src/.../components/`, so the fixture mirrors that layout.
async function writeFixtureSource(caseRoot, files) {
  const srcDir = path.join(caseRoot, "src", "pages");
  await mkdir(srcDir, { recursive: true });
  for (const file of files) {
    await writeFile(path.join(srcDir, file.name), file.content, "utf8");
  }
  return path.relative(workspacePath(".."), caseRoot);
}

async function runCase(testCase, fixtureRoot) {
  const targetArtifacts = path.join(fixtureRoot, testCase.name, "target-artifacts");
  await mkdir(targetArtifacts, { recursive: true });

  const caseRoot = path.join(fixtureRoot, testCase.name, "source");
  const sourceDir = await writeFixtureSource(caseRoot, testCase.files);

  const inputs = paramsInput({
    sourceDir,
    maxSourceBytes: testCase.maxSourceBytes,
    allowLargeFiles: [],
    allowSynchronousStorageFiles: (testCase.allowSynchronousStorageFiles ?? []).map((fileName) => path.join(sourceDir, "src", "pages", fileName))
  });

  const run = await runTarget(inputs, {
    VERIFIER_CHECK_ID: "known-bad-target:operations.performance-source-canary",
    VERIFIER_RUN_ID: testCase.name,
    VERIFIER_ARTIFACTS_DIR: targetArtifacts
  });

  const base = { name: testCase.name, stdout: truncate(run.stdout), stderr: truncate(run.stderr), exitCode: run.exitCode, inputs };
  if (run.error) return { ok: false, summary: `${testCase.name}: could not launch target`, findings: { ...base, error: run.error.message } };

  let result;
  try {
    result = parseSingleResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target did not emit a parseable Result`, findings: { ...base, parseError: error.message } };
  }

  const findings = {
    ...base,
    targetStatus: result.status,
    targetSummary: result.summary,
    largeFiles: result.findings?.largeFiles,
    synchronousStorageFindings: result.findings?.synchronousStorageFindings,
    allowedSynchronousStorageFindings: result.findings?.allowedSynchronousStorageFindings
  };
  const ok = testCase.check(result);
  return {
    ok,
    summary: ok
      ? `${testCase.name}: operations.performance-source-canary behaved as expected (${result.status}).`
      : `${testCase.name}: operations.performance-source-canary returned ${result.status}, not as expected.`,
    findings
  };
}

emit(async () => {
  const fixtureRoot = path.join(artifactsDir(), "fixture-source");
  const cases = [
    {
      name: "clean-source-passes",
      maxSourceBytes: 4096,
      files: [{ name: "CleanPage.tsx", content: "export default function CleanPage() { return <div /> }\n" }],
      check: (result) => result.status === "pass"
    },
    {
      name: "oversized-file-fails",
      maxSourceBytes: 50,
      files: [{ name: "BigPage.tsx", content: "export default function BigPage() { return <div>" + "x".repeat(300) + "</div> }\n" }],
      check: (result) =>
        result.status === "fail" &&
        /oversized/i.test(result.summary) &&
        Array.isArray(result.findings?.largeFiles) &&
        result.findings.largeFiles.length === 1
    },
    {
      name: "synchronous-storage-fails",
      maxSourceBytes: 4096,
      files: [{ name: "StoragePage.tsx", content: "export default function StoragePage() { const v = localStorage.getItem('k'); return <div>{v}</div> }\n" }],
      check: (result) =>
        result.status === "fail" &&
        /synchronous (localStorage|sessionStorage)/i.test(result.summary) &&
        Array.isArray(result.findings?.synchronousStorageFindings) &&
        result.findings.synchronousStorageFindings.length === 1
    },
    {
      name: "allowed-synchronous-storage-passes",
      maxSourceBytes: 4096,
      allowSynchronousStorageFiles: ["AllowedStoragePage.tsx"],
      files: [{ name: "AllowedStoragePage.tsx", content: "export default function AllowedStoragePage() { const v = sessionStorage.getItem('k'); return <div>{v}</div> }\n" }],
      check: (result) =>
        result.status === "pass" &&
        Array.isArray(result.findings?.synchronousStorageFindings) &&
        result.findings.synchronousStorageFindings.length === 0 &&
        Array.isArray(result.findings?.allowedSynchronousStorageFindings) &&
        result.findings.allowedSynchronousStorageFindings.length === 1
    }
  ];

  const results = [];
  for (const testCase of cases) results.push(await runCase(testCase, fixtureRoot));
  const failures = results.filter((r) => !r.ok);
  const findings = { cases: results.map((r) => r.findings) };
  if (failures.length > 0) {
    return fail(`operations.performance-source-canary known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  }
  return pass(`operations.performance-source-canary known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
