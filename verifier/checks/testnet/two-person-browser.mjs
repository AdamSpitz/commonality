import { emit, errorResult, fail, pass, uncertain, workspacePath } from "../lib/result.mjs";
import { envValue, fetchText, readEnvFile, readTestnetConfig, requireOptIn } from "./lib.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ALIGNMENT_ATTESTATIONS_ABI = [{
  type: "function",
  name: "attestAlignment",
  stateMutability: "nonpayable",
  inputs: [
    { name: "subjectId", type: "bytes32" },
    { name: "statementId", type: "bytes32" },
    { name: "topicStatementId", type: "bytes32" }
  ],
  outputs: []
}];

const EVENT_NAME = "AlignmentAttestation";
const VERIFIER_STATEMENT_ID = "0x0000000000000000000000000000000000000000000000000000000000000001";
const VERIFIER_TOPIC_ID = "0x0000000000000000000000000000000000000000000000000000000000000002";

async function loadPlaywright() {
  try {
    return await import("@playwright/test");
  } catch (error) {
    return { importError: error };
  }
}

function parseEnv(content) {
  const entries = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    entries.set(trimmed.slice(0, index), trimmed.slice(index + 1).replace(/^['"]|['"]$/g, ""));
  }
  return entries;
}

async function loadRepoSecrets() {
  const root = path.resolve(workspacePath(), "..");
  const files = [path.join(root, ".env.secrets"), path.join(root, ".env")];
  const merged = new Map();
  for (const file of files) {
    try {
      const parsed = parseEnv(await readFile(file, "utf8"));
      for (const [key, value] of parsed) {
        if (!merged.has(key)) merged.set(key, value);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) merged.set(key, value);
  }
  return merged;
}

function secret(env, name) {
  const value = env.get(name) || process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function leftPadAddressTopic(address) {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

function eventCacheUrl(config, params) {
  const base = new URL("/api/events", config.eventCacheUrl ?? config.graphqlUrl.replace(/\/graphql\/?$/, ""));
  for (const [key, value] of Object.entries(params)) base.searchParams.set(key, String(value));
  return base.toString();
}

async function loadConfigFromPage(page, origin) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { status: response.status, body: await response.text() };
  }, `${origin.replace(/\/$/, "")}/config.json`);
}

function configLooksDeployed(text) {
  const forbidden = /localhost|127\.0\.0\.1|31337/i;
  return !forbidden.test(text) && /commonality-indexer\.onrender\.com/i.test(text);
}

async function driveAssist(page) {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/#/causes`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  const configProbe = await loadConfigFromPage(page, origin);
  let assistUrl = "";
  try {
    const parsed = JSON.parse(configProbe.body);
    assistUrl = String(parsed.VITE_CAUSE_ASSIST_URL ?? parsed.CAUSE_ASSIST_URL ?? "").replace(/\/$/, "");
  } catch {
    assistUrl = "";
  }

  const ui = { startedCause: false, pickerVisible: false, searchClicked: false, noneFitClicked: false };
  try {
    const causes = page.getByTestId("nav-causes");
    if (await causes.count()) {
      await causes.first().click({ timeout: 5000 }).catch(() => {});
    }
    const start = page.getByTestId("causes-start-cause");
    if (await start.count()) {
      await start.first().click({ timeout: 8000 });
      ui.startedCause = true;
      await page.getByTestId("cause-detail-page").waitFor({ timeout: 15000 }).catch(() => {});
    }
    const picker = page.getByTestId("statement-picker-intent");
    if (await picker.count()) {
      ui.pickerVisible = true;
      await picker.first().fill("Neighborhood tool library that stays open on weekends");
      const search = page.getByTestId("statement-picker-search");
      if (await search.count()) {
        await search.first().click();
        ui.searchClicked = true;
      }
      const noneFit = page.getByTestId("statement-picker-none-fit");
      await noneFit.first().waitFor({ timeout: 25000 }).catch(() => {});
      if (await noneFit.count()) {
        await noneFit.first().click();
        ui.noneFitClicked = true;
        await page.waitForTimeout(4000);
      }
    }
  } catch (error) {
    ui.uiError = error.message;
  }

  const atomize = assistUrl
    ? await page.evaluate(async ({ url }) => {
        try {
          const response = await fetch(`${url}/atomize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: "A neighborhood tool library that stays open on weekends",
              existingPlanks: [],
              count: 2
            })
          });
          const text = await response.text();
          return { ok: response.ok, status: response.status, bodySample: text.slice(0, 800) };
        } catch (error) {
          return { ok: false, status: "request-error", bodySample: String(error?.message ?? error) };
        }
      }, { url: assistUrl })
    : { ok: false, status: "missing-url", bodySample: "VITE_CAUSE_ASSIST_URL missing from config.json" };

  return { configProbe, assistUrl, ui, atomize };
}

async function mutateFromLabA(config, env) {
  const { createPublicClient, createWalletClient, http, keccak256, toBytes } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const rpcUrl = env.get("COMMONALITY_TESTNET_RPC_URL") || env.get("BASE_SEPOLIA_RPC_URL") || envValue(config.rpcUrlEnv ?? "COMMONALITY_TESTNET_RPC_URL");
  const privateKey = secret(env, "COMMONALITY_TESTNET_LAB_A_PRIVATE_KEY");
  const contractEnv = await readEnvFile(config.contractsEnvFile);
  const contractAddress = contractEnv.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS missing");
  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const chain = {
    id: Number(config.chainId),
    name: config.chainName ?? "testnet",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } }
  };
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const subjectId = keccak256(toBytes(`commonality-two-person:${new Date().toISOString()}:${account.address}`));
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ALIGNMENT_ATTESTATIONS_ABI,
    functionName: "attestAlignment",
    args: [subjectId, VERIFIER_STATEMENT_ID, VERIFIER_TOPIC_ID]
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
  return { hash, receiptStatus: receipt.status, attester: account.address, subjectId, contractAddress };
}

async function waitForEvent(config, expected) {
  const deadline = Date.now() + 120000;
  const attempts = [];
  while (Date.now() <= deadline) {
    const probe = await fetchText(eventCacheUrl(config, {
      chainId: config.chainId,
      contractAddress: expected.contractAddress,
      eventName: EVENT_NAME,
      topic1: leftPadAddressTopic(expected.attester),
      topic2: expected.subjectId,
      topic3: VERIFIER_STATEMENT_ID,
      limit: 10
    }), { maxBodyChars: 8000 });
    let items = [];
    try { items = JSON.parse(probe.body).items ?? []; } catch { items = []; }
    attempts.push({ status: probe.status, itemCount: items.length });
    const match = items.find((item) => item.transactionHash?.toLowerCase() === expected.hash.toLowerCase());
    if (match) return { ok: true, match, attempts };
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  return { ok: false, attempts };
}

emit(async () => {
  try { requireOptIn(); } catch (error) {
    return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } });
  }
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS !== "1") {
    return errorResult("Refusing two-person browser lab without COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1.", {
      findings: { requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS"] }
    });
  }

  const { chromium, importError } = await loadPlaywright();
  if (importError) {
    return uncertain("Playwright is not available.", { findings: { error: importError.message } });
  }

  const config = await readTestnetConfig();
  const env = await loadRepoSecrets();
  const origin = config.appUrl.replace(/\/$/, "");
  const browser = await chromium.launch({ headless: true });
  const findings = { origin };

  try {
    const contextA = await browser.newContext({ userAgent: "CommonalityLab/A", viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ userAgent: "CommonalityLab/B", viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await pageA.goto(`${origin}/#/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pageB.goto(`${origin}/#/causes`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pageA.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await pageB.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    const titleA = await pageA.title();
    const titleB = await pageB.title();
    const bodyA = (await pageA.locator("body").innerText({ timeout: 8000 }).catch(() => "")).slice(0, 600);
    const bodyB = (await pageB.locator("body").innerText({ timeout: 8000 }).catch(() => "")).slice(0, 600);
    const configA = await loadConfigFromPage(pageA, origin);
    const configB = await loadConfigFromPage(pageB, origin);
    findings.clients = {
      a: { title: titleA, bodySample: bodyA, configStatus: configA.status, deployedConfig: configLooksDeployed(configA.body) },
      b: { title: titleB, bodySample: bodyB, configStatus: configB.status, deployedConfig: configLooksDeployed(configB.body) }
    };

    findings.assist = await driveAssist(pageA);

    const sameWorld = findings.clients.a.deployedConfig && findings.clients.b.deployedConfig && configA.body === configB.body;
    if (!sameWorld) {
      return fail("Two browser contexts did not load the same deployed CauseStarter config.", { findings });
    }

    if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION === "1") {
      try {
        const write = await mutateFromLabA(config, env);
        const indexed = await waitForEvent(config, write);
        const seenFromB = await pageB.evaluate(async (url) => {
          const response = await fetch(url, { cache: "no-store" });
          return { status: response.status, body: await response.text() };
        }, eventCacheUrl(config, {
          chainId: config.chainId,
          contractAddress: write.contractAddress,
          eventName: EVENT_NAME,
          topic1: leftPadAddressTopic(write.attester),
          topic2: write.subjectId,
          topic3: VERIFIER_STATEMENT_ID,
          limit: 10
        }));
        findings.write = { ...write, indexed, observerB: { status: seenFromB.status, bodySample: seenFromB.body.slice(0, 500) } };
        if (!indexed.ok) {
          return fail("Lab A write landed on chain but observer B / event cache did not see it in time.", { findings });
        }
      } catch (error) {
        findings.write = { error: error.message };
        return uncertain(`Two browsers share config, but the signed write path failed: ${error.message}`, { findings });
      }
    } else {
      findings.write = { skipped: true, reason: "COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION is not 1" };
    }

    const atomizeOk = findings.assist.atomize?.ok === true;
    if (!atomizeOk) {
      return uncertain("Two browsers share the live CauseStarter world, but cause-assist atomize from the page origin failed.", { findings });
    }
    return pass("Two independent Chromium contexts loaded CauseStarter, shared deployed config, and atomize answered from the page origin.", { findings });
  } finally {
    await browser.close();
  }
});
