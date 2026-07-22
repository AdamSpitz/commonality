import { emit, errorResult, fail, pass, uncertain } from "../lib/result.mjs";
import { readTestnetConfig, requireOptIn } from "./lib.mjs";

const MAX_CONSOLE_ERRORS = 0;

function isNonFatalResourceResponse(response) {
  const status = response.status();
  if (status < 500) return false;
  const url = response.url();
  // Some older on-chain testnet projects point at IPFS metadata that is no longer
  // retrievable through the deployed indexer/gateway. The UI handles that by
  // showing fallback project cards plus an inline warning; don't fail the whole
  // deployed shell smoke on those historical data holes. Real app crashes still
  // fail via page errors, obvious failure text, short body, or non-resource
  // console errors.
  return /\/(api\/)?(ipfs|documents?)\//i.test(url) || /[?&](cid|metadataCid)=/i.test(url);
}

async function loadPlaywright() {
  try {
    return await import("@playwright/test");
  } catch (error) {
    return { importError: error };
  }
}

function routeLabel(url) {
  const parsed = new URL(url);
  return `${parsed.hostname.split(".")[0]}${parsed.hash || parsed.pathname}`;
}

function configuredJourneyUrls(config) {
  if (!Array.isArray(config.websiteJourneys) || config.websiteJourneys.length === 0) return config.appUrls;
  const urls = [];
  for (const journey of config.websiteJourneys) {
    const base = new URL(journey.url);
    for (const path of journey.paths ?? ["/"]) {
      const next = new URL(base.toString());
      if (path.startsWith("/#")) {
        next.pathname = "/";
        next.hash = path.slice(2);
      } else {
        next.pathname = path;
        next.hash = "";
      }
      urls.push(next.toString());
    }
  }
  return [...new Set(urls)];
}

async function probeApp(page, url) {
  const consoleErrors = [];
  const pageErrors = [];
  const nonFatalResourceErrors = [];
  const blockingResponseErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error) => pageErrors.push(error.message);
  const onResponse = (response) => {
    if (response.status() < 500) return;
    const entry = { url: response.url(), status: response.status() };
    if (isNonFatalResourceResponse(response)) nonFatalResourceErrors.push(entry);
    else blockingResponseErrors.push(entry);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const title = await page.title();
    const bodyText = (await page.locator("body").innerText({ timeout: 5000 })).trim();
    const hasRoot = await page.locator("#root").count();
    const visibleLinks = await page.locator("a:visible").count().catch(() => 0);
    const visibleButtons = await page.locator("button:visible").count().catch(() => 0);
    const obviousFailureText = /application error|failed to load ui runtime config|vite|cannot find module|not found/i.test(bodyText);
    const genericResourceConsoleErrors = consoleErrors.filter((text) => /Failed to load resource:/i.test(text));
    const blockingConsoleErrors = consoleErrors.filter((text) => !/Failed to load resource:/i.test(text));
    const toleratedResourceConsoleErrors = Math.min(genericResourceConsoleErrors.length, nonFatalResourceErrors.length);
    const effectiveConsoleErrorCount = blockingConsoleErrors.length + Math.max(0, genericResourceConsoleErrors.length - toleratedResourceConsoleErrors);
    return {
      url,
      label: routeLabel(url),
      ok: Boolean(response?.ok()) && bodyText.length > 80 && hasRoot > 0 && !obviousFailureText && effectiveConsoleErrorCount <= MAX_CONSOLE_ERRORS && blockingResponseErrors.length === 0 && pageErrors.length === 0,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      title,
      bodyLength: bodyText.length,
      bodySample: bodyText.slice(0, 500),
      hasRoot: hasRoot > 0,
      visibleLinks,
      visibleButtons,
      consoleErrors: consoleErrors.slice(0, 10),
      blockingConsoleErrors: blockingConsoleErrors.slice(0, 10),
      nonFatalResourceErrors: nonFatalResourceErrors.slice(0, 10),
      blockingResponseErrors: blockingResponseErrors.slice(0, 10),
      pageErrors: pageErrors.slice(0, 10),
      obviousFailureText
    };
  } catch (error) {
    return { url, label: routeLabel(url), ok: false, error: error.message, consoleErrors: consoleErrors.slice(0, 10), pageErrors: pageErrors.slice(0, 10) };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
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
    const journeyUrls = configuredJourneyUrls(config);
    for (const url of journeyUrls) {
      const page = await context.newPage();
      probes.push(await probeApp(page, url));
      await page.close().catch(() => {});
    }
    const failed = probes.filter((probe) => !probe.ok);
    const findings = { probes, coverage: { appUrlsChecked: config.appUrls.length, routeUrlsChecked: probes.length, mutation: false, wallet: false } };
    if (failed.length > 0) return fail(`Deployed browser journeys failed for ${failed.length}/${probes.length} app URL(s).`, { findings });
    return pass(`Deployed browser journeys rendered ${probes.length} app URL(s) without page errors.`, { findings });
  } finally {
    await browser.close();
  }
});
