import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { workspacePath } from "./result.mjs";

const DOMAINS = [
  { id: "commonality", viteDomain: "commonality" },
  { id: "lazy-giving", viteDomain: "lazyGiving" },
  { id: "alignment", viteDomain: "alignment" },
  { id: "tally", viteDomain: "tally" },
  { id: "content-funding", viteDomain: "content-funding" },
  { id: "civility", viteDomain: "civility" },
  { id: "common-sense-majority", viteDomain: "common-sense-majority" },
  { id: "conceptspace", viteDomain: "conceptspace" }
];

function artifactRelativePath(name) {
  const artifactsDir = process.env.VERIFIER_ARTIFACTS_DIR;
  if (!artifactsDir) return null;
  return path.relative(workspacePath(), path.join(artifactsDir, name));
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
}

async function importChromium() {
  const modulePath = path.resolve(workspacePath(), "..", "ui", "node_modules", "@playwright", "test", "index.js");
  const mod = await import(pathToFileURL(modulePath));
  if (!mod.chromium) throw new Error("@playwright/test did not export chromium.");
  return mod.chromium;
}

async function captureDomainScreenshot({ domain, port, chromium, artifactsDir }) {
  const root = workspacePath("..");
  const server = spawn("npm", ["run", "dev", "--workspace=ui", "--", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env: { ...process.env, VITE_DOMAIN: domain.viteDomain, CHOKIDAR_USEPOLLING: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });

  try {
    const url = `http://127.0.0.1:${port}/`;
    await waitForUrl(url, 45000);
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 1 });
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const fileName = `${domain.id}-landing.png`;
      const absolutePath = path.join(artifactsDir, fileName);
      await page.screenshot({ path: absolutePath, fullPage: true });
      return {
        name: `${domain.id}-landing-screenshot`,
        path: artifactRelativePath(fileName),
        mimeType: "image/png",
        description: `Rendered landing page screenshot for ${domain.id} at desktop width.`
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    throw new Error(`${domain.id}: ${error?.message ?? String(error)}\n${serverOutput.slice(-2000)}`);
  } finally {
    server.kill("SIGTERM");
    setTimeout(() => server.kill("SIGKILL"), 2000).unref();
  }
}

export async function maybeCaptureLandingScreenshots({ enabled = process.env.COMMONALITY_VERIFIER_CAPTURE_LANDING_SCREENSHOTS === "1" } = {}) {
  const artifactsDir = process.env.VERIFIER_ARTIFACTS_DIR;
  if (!enabled) {
    return {
      enabled: false,
      artifacts: [],
      note: "Landing screenshots were not captured. Set COMMONALITY_VERIFIER_CAPTURE_LANDING_SCREENSHOTS=1 to add Playwright desktop screenshots to this LLM review."
    };
  }
  if (!artifactsDir) throw new Error("VERIFIER_ARTIFACTS_DIR is not set; cannot capture landing screenshots.");

  await mkdir(artifactsDir, { recursive: true });
  const chromium = await importChromium();
  const artifacts = [];
  const errors = [];
  let port = 5310;
  for (const domain of DOMAINS) {
    try {
      artifacts.push(await captureDomainScreenshot({ domain, port, chromium, artifactsDir }));
    } catch (error) {
      errors.push(error?.message ?? String(error));
    }
    port += 1;
  }

  return {
    enabled: true,
    artifacts,
    note: errors.length > 0
      ? `Captured ${artifacts.length}/${DOMAINS.length} landing screenshot(s). Errors: ${errors.join(" | ")}`
      : `Captured ${artifacts.length} landing screenshot(s).`
  };
}
