import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, truncate, uncertain, writeTextArtifact } from "../lib/result.mjs";

function inputData(inputs, as) {
  return inputs.find((input) => input.as === as)?.data;
}

function parseAllowlist(raw) {
  if (!raw) return new Set();
  const parsed = JSON.parse(raw);
  const entries = Array.isArray(parsed) ? parsed : parsed.allowed ?? [];
  if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) {
    throw new Error("dependency audit allowlist must be an array of package names or { allowed: [...] }.");
  }
  return new Set(entries);
}

async function npmAudit(args, label) {
  const fixtureDir = process.env.COMMONALITY_DEPENDENCY_AUDIT_FIXTURE_DIR;
  if (fixtureDir) {
    const filename = label === "production dependencies" ? "production.json" : "full.json";
    try {
      return { exitCode: 0, signal: null, stdout: await readFile(path.join(fixtureDir, filename), "utf8"), stderr: "" };
    } catch (error) {
      return { error, stdout: "", stderr: "" };
    }
  }

  return await new Promise((resolve) => {
    const child = spawn("npm", ["audit", "--json", ...args], {
      cwd: process.env.VERIFIER_REPO_ROOT ?? new URL("../../..", import.meta.url).pathname,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => resolve({ error, stdout, stderr }));
    child.on("close", (exitCode, signal) => resolve({ exitCode, signal, stdout, stderr }));
  });
}

function vulnerabilitiesByName(auditJson) {
  return auditJson?.vulnerabilities && typeof auditJson.vulnerabilities === "object" ? auditJson.vulnerabilities : {};
}

function parseAuditJson(run, label) {
  if (run.error) {
    return { error: `Could not launch npm audit (${label}): ${run.error.message}` };
  }
  try {
    return { json: JSON.parse(run.stdout || "{}") };
  } catch (error) {
    return { error: `Could not parse npm audit JSON (${label}): ${error.message}`, stdoutTail: truncate(run.stdout, 2000), stderrTail: truncate(run.stderr, 2000) };
  }
}

function severe(vulnerability) {
  return vulnerability?.severity === "critical" || vulnerability?.severity === "high";
}

emit(async () => {
  const inputs = readInputs();
  const allowlist = parseAllowlist(inputData(inputs, "allowlist"));

  const [fullRun, prodRun] = await Promise.all([npmAudit([], "all dependencies"), npmAudit(["--omit=dev"], "production dependencies")]);
  const full = parseAuditJson(fullRun, "all dependencies");
  const prod = parseAuditJson(prodRun, "production dependencies");
  if (full.error || prod.error) {
    return uncertain("npm audit did not produce parseable JSON.", { findings: { full, prod } });
  }

  const prodNames = new Set(Object.keys(vulnerabilitiesByName(prod.json)));
  const reportable = Object.entries(vulnerabilitiesByName(full.json))
    .filter(([, vulnerability]) => severe(vulnerability))
    .filter(([name, vulnerability]) => vulnerability.isDirect || prodNames.has(name))
    .filter(([name]) => !allowlist.has(name))
    .map(([name, vulnerability]) => ({
      name,
      severity: vulnerability.severity,
      direct: Boolean(vulnerability.isDirect),
      production: prodNames.has(name),
      range: vulnerability.range,
      fixAvailable: vulnerability.fixAvailable
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const artifacts = [
    await writeTextArtifact("npm-audit-full.json", JSON.stringify(full.json, null, 2), "application/json", "Full npm audit --json output"),
    await writeTextArtifact("npm-audit-production.json", JSON.stringify(prod.json, null, 2), "application/json", "npm audit --omit=dev --json output")
  ];

  const findings = {
    highOrCriticalDirectOrProduction: reportable,
    allowlist: [...allowlist],
    metadata: full.json.metadata
  };

  if (reportable.length > 0) {
    return fail(`npm audit found ${reportable.length} unallowlisted high/critical direct or production vulnerabilit${reportable.length === 1 ? "y" : "ies"}.`, { findings, artifacts });
  }
  return pass("npm audit found no unallowlisted high/critical direct or production vulnerabilities.", { findings, artifacts });
});
