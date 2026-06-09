import { emit, errorResult, fail, pass, uncertain } from "../lib/result.mjs";
import { readTestnetConfig, requireOptIn } from "./lib.mjs";

const MAX_CONSOLE_ERRORS = 0;

async function loadPlaywright() {
  try {
    return await import("@playwright/test");
  } catch (error) {
    return { importError: error };
  }
}

function routeLabel(url) {
  return new URL(url).hostname.split(".")[0];
}

async function probeApp(page, url) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error) => pageErrors.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const title = await page.title();
    const bodyText = (await page.locator("body").innerText({ timeout: 5000 })).trim();
    const hasRoot = await page.locator("#root").count();
    const visibleLinks = await page.locator("a:visible").count().catch(() => 0);
    const visibleButtons = await page.locator("button:visible").count().catch(() => 0);
    const obviousFailureText = /application error|failed to load ui runtime config|vite|cannot find module|not found/i.test(bodyText);
    return {
      url,
      label: routeLabel(url),
      ok: Boolean(response?.ok()) && bodyText.length > 80 && hasRoot > 0 && !obviousFailureText && consoleErrors.length <= MAX_CONSOLE_ERRORS && pageErrors.length === 0,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      title,
      bodyLength: bodyText.length,
      bodySample: bodyText.slice(0, 500),
      hasRoot: hasRoot > 0,
      visibleLinks,
      visibleButtons,
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors: pageErrors.slice(0, 10),
      obviousFailureText
    };
  } catch (error) {
    return { url, label: routeLabel(url), ok: false, error: error.message, consoleErrors: consoleErrors.slice(0, 10), pageErrors: pageErrors.slice(0, 10) };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS !== "1") {
    return errorResult("Refusing to run deployed browser journeys without COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1.", {
      findings: {
        requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS"],
        mutatesState: false,
        scope: "Loads every configured deployed app URL in Chromium, checks that the React app shell renders, and rejects console/page errors or obvious error screens."
      }
    });
  }

  const { chromium, importError } = await loadPlaywright();
  if (importError) {
    return uncertain("Playwright is not available, so deployed browser journeys cannot run in this shell.", { findings: { error: importError.message } });
  }

  const config = await readTestnetConfig();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: false, viewport: { width: 1366, height: 900 } });
    const probes = [];
    for (const url of config.appUrls) {
      const page = await context.newPage();
      probes.push(await probeApp(page, url));
      await page.close().catch(() => {});
    }
    const failed = probes.filter((probe) => !probe.ok);
    const findings = { probes, coverage: { appUrlsChecked: probes.length, mutation: false, wallet: false } };
    if (failed.length > 0) return fail(`Deployed browser journeys failed for ${failed.length}/${probes.length} app URL(s).`, { findings });
    return pass(`Deployed browser journeys rendered ${probes.length} app URL(s) without page errors.`, { findings });
  } finally {
    await browser.close();
  }
});
