import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { emit, fail, pass, readInputs, truncate, workspacePath, writeTextArtifact } from "../lib/result.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
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
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, timedOut: true, durationMs: Date.now() - started, stdout, stderr });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error, durationMs: Date.now() - started, stdout, stderr });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, code, signal, durationMs: Date.now() - started, stdout, stderr });
    });
  });
}

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"]
]);

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function startStaticServer(rootDir) {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");
      const decoded = decodeURIComponent(requestUrl.pathname);
      const safePath = decoded.split("/").filter(Boolean).join(path.sep);
      let filePath = path.join(rootDir, safePath);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      if (!(await fileExists(filePath))) filePath = path.join(rootDir, safePath, "index.html");
      if (!(await fileExists(filePath))) filePath = path.join(rootDir, "index.html");
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": MIME_TYPES.get(path.extname(filePath)) ?? "application/octet-stream" });
      res.end(body);
    } catch (error) {
      res.writeHead(500).end(error.message);
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function timingFromPerformance(timing) {
  return {
    domContentLoadedMs: Math.round(timing.domContentLoadedEventEnd - timing.startTime),
    loadMs: Math.round(timing.loadEventEnd - timing.startTime),
    responseEndMs: Math.round(timing.responseEnd - timing.startTime)
  };
}

async function measurePage(page, baseUrl, target) {
  const started = Date.now();
  const response = await page.goto(`${baseUrl}${target.path}`, { waitUntil: "load", timeout: target.timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: target.networkIdleTimeoutMs });
  const totalMs = Date.now() - started;
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return nav ? {
      startTime: nav.startTime,
      responseEnd: nav.responseEnd,
      domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
      loadEventEnd: nav.loadEventEnd
    } : null;
  });
  return {
    ...target,
    status: response?.status() ?? null,
    ok: response?.ok() ?? false,
    totalMs,
    ...(timing ? timingFromPerformance(timing) : {})
  };
}

function renderReport({ distDir, budgets, measurements, build }) {
  const lines = ["# UI page-load timing", "", "Browser timing probe against the built domain pages served from local static files. This is a deterministic UX-timing smoke test, not a substitute for production load testing.", ""];
  lines.push("## Scope", "", `- distDir: ${distDir}`, `- maxLoadMs: ${budgets.maxLoadMs}`, `- maxNetworkIdleMs: ${budgets.maxNetworkIdleMs}`, "");
  if (build) lines.push("## Build", "", `- durationMs: ${build.durationMs}`, `- exit: ${build.code ?? build.signal ?? (build.timedOut ? "timeout" : "unknown")}`, "");
  lines.push("## Measurements", "");
  for (const measurement of measurements) {
    lines.push(`- ${measurement.name} (${measurement.path}): status=${measurement.status}, domContentLoaded=${measurement.domContentLoadedMs ?? "n/a"}ms, load=${measurement.loadMs ?? "n/a"}ms, networkIdle=${measurement.totalMs}ms`);
  }
  lines.push("");
  return lines.join("\n");
}

emit(async () => {
  const params = mergedParams(readInputs());
  const distDir = params.distDir ?? "ui/dist";
  const distRoot = workspacePath("..", distDir);
  const buildCommand = params.buildCommand ?? ["npm", "run", "ui:build:domains"];
  const commandTimeoutMs = params.commandTimeoutMs ?? 240000;
  const budgets = {
    maxLoadMs: params.budget?.maxLoadMs ?? 2500,
    maxNetworkIdleMs: params.budget?.maxNetworkIdleMs ?? 5000
  };
  const targets = params.targets ?? [
    { name: "commonality", path: "/commonality/" },
    { name: "lazyGiving", path: "/lazyGiving/" },
    { name: "content-funding", path: "/content-funding/" },
    { name: "tally", path: "/tally/" }
  ];

  let build = null;
  if (params.skipBuild !== true) {
    build = await runCommand(buildCommand, commandTimeoutMs);
    if (!build.ok) {
      return {
        status: build.timedOut ? "error" : "fail",
        summary: build.timedOut ? `UI build timed out after ${commandTimeoutMs}ms.` : "UI build failed before page-load timing evaluation.",
        findings: { command: buildCommand, durationMs: build.durationMs, exitCode: build.code, signal: build.signal, stdoutTail: truncate(build.stdout, 3000), stderrTail: truncate(build.stderr, 3000), error: build.error?.message }
      };
    }
  }

  const { server, baseUrl } = await startStaticServer(distRoot);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const measurements = [];
    for (const target of targets) {
      measurements.push(await measurePage(page, baseUrl, {
        timeoutMs: params.pageTimeoutMs ?? 15000,
        networkIdleTimeoutMs: params.networkIdleTimeoutMs ?? 10000,
        ...target
      }));
    }

    const problems = [];
    for (const measurement of measurements) {
      if (!measurement.ok) problems.push(`${measurement.name}: HTTP status ${measurement.status}.`);
      if ((measurement.loadMs ?? Infinity) > budgets.maxLoadMs) problems.push(`${measurement.name}: load ${measurement.loadMs ?? "n/a"}ms exceeds budget ${budgets.maxLoadMs}ms.`);
      if (measurement.totalMs > budgets.maxNetworkIdleMs) problems.push(`${measurement.name}: network-idle ${measurement.totalMs}ms exceeds budget ${budgets.maxNetworkIdleMs}ms.`);
    }

    const artifact = await writeTextArtifact("page-load-timing.md", renderReport({ distDir, budgets, measurements, build }), "text/markdown", "Browser page-load timing report.");
    const findings = { budgets, measurements, problems, build: build ? { command: buildCommand, durationMs: build.durationMs } : undefined };
    if (problems.length > 0) return fail(`UI page-load timing has ${problems.length} budget/status problem(s).`, { findings, artifacts: [artifact] });
    return pass(`UI page-load timing passed for ${measurements.length} built page(s).`, { findings, artifacts: [artifact] });
  } finally {
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
});
