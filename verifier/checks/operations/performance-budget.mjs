import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { emit, fail, pass, readInputs, truncate, workspacePath, writeTextArtifact } from "../lib/result.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseBudget(params) {
  const budget = params.budget ?? {};
  return {
    maxSingleJsBytes: budget.maxSingleJsBytes ?? 2_000_000,
    maxJsBytesPerDomain: budget.maxJsBytesPerDomain ?? 8_000_000,
    maxCssBytesPerDomain: budget.maxCssBytesPerDomain ?? 250_000,
    maxHtmlBytesPerDomain: budget.maxHtmlBytesPerDomain ?? 100_000
  };
}

async function runCommand(command, timeoutMs) {
  const [program, ...args] = command;
  const cwd = workspacePath("..");
  const started = Date.now();

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn(program, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      if (settled) return;
      child.kill("SIGKILL");
      settled = true;
      resolve({ ok: false, timedOut: true, durationMs: Date.now() - started, stdout, stderr });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      resolve({ ok: false, error, durationMs: Date.now() - started, stdout, stderr });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      resolve({ ok: code === 0, code, signal, durationMs: Date.now() - started, stdout, stderr });
    });
  });
}

async function collectFilesFromDist(distDir) {
  const root = workspacePath("..", distDir);
  const files = [];

  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        return;
      }
      const info = await stat(entryPath);
      files.push({ path: path.relative(root, entryPath), bytes: info.size });
    }));
  }

  await visit(root);
  return files;
}

function collectFilesFromInput(input) {
  if (!input) return null;
  if (input.content === null || input.content === undefined) throw new Error(`Could not read asset manifest file: ${input.path}`);
  const parsed = JSON.parse(input.content);
  const files = Array.isArray(parsed) ? parsed : parsed.files;
  if (!Array.isArray(files)) throw new Error("Asset manifest must be an array or an object with a files array.");
  return files.map((file, index) => {
    if (typeof file?.path !== "string" || typeof file?.bytes !== "number") {
      throw new Error(`Asset manifest file at index ${index} must have string path and number bytes.`);
    }
    return { path: file.path, bytes: file.bytes };
  });
}

function domainFor(filePath) {
  const parts = filePath.split(/[\\/]+/);
  if (parts.length > 1 && parts[1] === "assets") return parts[0];
  if (parts.length > 1 && parts[1] === "index.html") return parts[0];
  return "root";
}

function summarizeAssets(files) {
  const domains = new Map();
  const considered = files.filter((file) => /\.(js|css|html)$/.test(file.path));

  for (const file of considered) {
    const domain = domainFor(file.path);
    const entry = domains.get(domain) ?? { domain, jsBytes: 0, cssBytes: 0, htmlBytes: 0, largestJs: null, fileCount: 0 };
    entry.fileCount += 1;
    if (file.path.endsWith(".js")) {
      entry.jsBytes += file.bytes;
      if (!entry.largestJs || file.bytes > entry.largestJs.bytes) entry.largestJs = file;
    } else if (file.path.endsWith(".css")) {
      entry.cssBytes += file.bytes;
    } else if (file.path.endsWith(".html")) {
      entry.htmlBytes += file.bytes;
    }
    domains.set(domain, entry);
  }

  return [...domains.values()].sort((a, b) => a.domain.localeCompare(b.domain));
}

function budgetProblems(domainSummaries, budget) {
  const problems = [];
  for (const domain of domainSummaries) {
    if (domain.jsBytes > budget.maxJsBytesPerDomain) {
      problems.push(`${domain.domain}: JS assets total ${domain.jsBytes} bytes exceeds per-domain budget ${budget.maxJsBytesPerDomain}.`);
    }
    if (domain.cssBytes > budget.maxCssBytesPerDomain) {
      problems.push(`${domain.domain}: CSS assets total ${domain.cssBytes} bytes exceeds per-domain budget ${budget.maxCssBytesPerDomain}.`);
    }
    if (domain.htmlBytes > budget.maxHtmlBytesPerDomain) {
      problems.push(`${domain.domain}: HTML total ${domain.htmlBytes} bytes exceeds per-domain budget ${budget.maxHtmlBytesPerDomain}.`);
    }
    if (domain.largestJs && domain.largestJs.bytes > budget.maxSingleJsBytes) {
      problems.push(`${domain.domain}: largest JS asset ${domain.largestJs.path} is ${domain.largestJs.bytes} bytes, exceeding single-asset budget ${budget.maxSingleJsBytes}.`);
    }
  }
  return problems;
}

function renderReport({ budget, domains, problems, build }) {
  const lines = ["# UI performance budget", "", "Deterministic bundle-size proxy for launch performance. Byte counts are uncompressed build artifacts; this is not a substitute for real latency/load testing.", ""];
  lines.push("## Budget", "");
  for (const [key, value] of Object.entries(budget)) lines.push(`- ${key}: ${value} bytes`);
  lines.push("");
  if (build) {
    lines.push("## Build", "", `- durationMs: ${build.durationMs}`, `- exit: ${build.code ?? build.signal ?? (build.timedOut ? "timeout" : "unknown")}`, "");
  }
  lines.push("## Domains", "");
  for (const domain of domains) {
    lines.push(`- ${domain.domain}: js=${domain.jsBytes}, css=${domain.cssBytes}, html=${domain.htmlBytes}, largestJs=${domain.largestJs?.bytes ?? 0} (${domain.largestJs?.path ?? "none"})`);
  }
  lines.push("", "## Problems", "");
  if (problems.length === 0) lines.push("_None._");
  else for (const problem of problems) lines.push(`- ${problem}`);
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const budget = parseBudget(params);
  const buildCommand = params.buildCommand ?? ["npm", "run", "ui:build:domains"];
  const commandTimeoutMs = params.commandTimeoutMs ?? 240000;
  const manifestInput = findFileInput(inputs, "assetManifest");

  let build = null;
  if (!manifestInput && params.skipBuild !== true) {
    if (!Array.isArray(buildCommand) || buildCommand.length === 0 || buildCommand.some((part) => typeof part !== "string")) {
      throw new Error("params.buildCommand must be a string array.");
    }
    build = await runCommand(buildCommand, commandTimeoutMs);
    if (!build.ok) {
      return {
        status: build.timedOut ? "error" : "fail",
        summary: build.timedOut ? `UI build timed out after ${commandTimeoutMs}ms.` : "UI build failed before performance budget evaluation.",
        findings: {
          command: buildCommand,
          durationMs: build.durationMs,
          exitCode: build.code,
          signal: build.signal,
          stdoutTail: truncate(build.stdout, 3000),
          stderrTail: truncate(build.stderr, 3000),
          error: build.error?.message
        }
      };
    }
  }

  const files = collectFilesFromInput(manifestInput) ?? await collectFilesFromDist(params.distDir ?? "ui/dist");
  const domains = summarizeAssets(files);
  const problems = budgetProblems(domains, budget);
  const artifact = await writeTextArtifact("performance-budget.md", renderReport({ budget, domains, problems, build }), "text/markdown", "UI bundle-size performance budget report.");
  const findings = {
    budget,
    build: build ? { command: buildCommand, durationMs: build.durationMs } : undefined,
    domainCount: domains.length,
    domains,
    problems
  };

  if (problems.length > 0) {
    return fail(`UI performance budget has ${problems.length} budget violation(s).`, { findings, artifacts: [artifact] });
  }

  return pass(`UI performance budget passed for ${domains.length} domain build(s).`, { findings, artifacts: [artifact] });
});
