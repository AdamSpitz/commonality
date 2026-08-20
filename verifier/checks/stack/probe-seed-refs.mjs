/**
 * Assert tiny-seed CauseStarter artifacts exist on the local chain.
 * Reads MutableRefUpdater.getRef so an unseeded-but-reachable stack fails.
 */
import { readFile } from "node:fs/promises";
import { createPublicClient, getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.RPC_URL ?? "http://localhost:8545";
/** Same funded Hardhat keys the tiny seed bookmarks (`FUNDED_HARDHAT_DEV_KEYS`). */
const FUNDED_HARDHAT_DEV_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
];
const HARDHAT_ACCOUNTS = FUNDED_HARDHAT_DEV_KEYS.map((key) => privateKeyToAccount(key).address);

const GET_REF_ABI = [
  {
    type: "function",
    name: "getRef",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "name", type: "string" }
    ],
    outputs: [{ name: "", type: "string" }]
  }
];

function parseEnvFile(text) {
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function loadUpdaterAddress() {
  if (process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS) {
    return process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS;
  }
  const text = await readFile("deployments/localhost.env", "utf8");
  const env = parseEnvFile(text);
  const address = env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS ?? env.MUTABLE_REF_UPDATER_ADDRESS;
  if (!address) {
    throw new Error("MUTABLE_REF_UPDATER_CONTRACT_ADDRESS missing from deployments/localhost.env");
  }
  return address;
}

async function main() {
  const address = await loadUpdaterAddress();
  const client = createPublicClient({
    transport: http(RPC_URL)
  });

  const probes = [
    { owner: HARDHAT_ACCOUNTS[0], name: "local-food-systems", label: "Hardhat #0 local-food-systems roster" },
    { owner: HARDHAT_ACCOUNTS[0], name: "christianity", label: "Hardhat #0 christianity roster" },
    ...HARDHAT_ACCOUNTS.map((owner, index) => ({
      owner,
      name: "bookmarked-causes",
      label: `Hardhat #${index} bookmarked-causes`
    }))
  ];

  const missing = [];
  for (const probe of probes) {
    const value = await client.readContract({
      address: getAddress(address),
      abi: GET_REF_ABI,
      functionName: "getRef",
      args: [getAddress(probe.owner.toLowerCase()), probe.name]
    });
    if (typeof value !== "string" || value.length === 0) {
      missing.push(probe.label);
    }
  }

  if (missing.length > 0) {
    console.error(`Seed artifacts missing: ${missing.join("; ")}`);
    process.exit(1);
  }

  console.error(
    `Seed artifacts present: Hardhat #0 local-food-systems and christianity rosters; bookmarked-causes for Hardhat #0-#9.`
  );
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
