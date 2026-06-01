import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { createPublicClient, createWalletClient, getAddress, http, isAddress, zeroAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { labelhash, namehash, normalize } from 'viem/ens';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const manifestPath = path.join(root, 'deployments/testnet-names.json');
const secretsPath = path.join(root, '.env.secrets');

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const NAME_WRAPPER = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
const PUBLIC_RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63';
const MAX_EXPIRY = 2n ** 64n - 1n;

const REGISTRY_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'resolver',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
    ],
    outputs: [],
  },
];

const WRAPPER_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' },
    ],
    outputs: [],
  },
];

function usage() {
  console.log(`Usage: ./scripts/create-ens-subdomains.sh [--root <ens-root>] [--owner <address>] [--inspect] [--yes]\n\nCreates testnet.<root> and the UI names under it, setting each resolver to the\nENS public resolver. The root may be commonality.eth or an ENS-imported DNS\nname such as commonality.works.\n\nOptions:\n  --root <name>      Parent ENS name. Defaults to deployments/testnet-names.json ensRoot.\n  --owner <address>  Owner for created subnames. Defaults to ENS_OWNER_PRIVATE_KEY address.\n  --inspect          Print registry/wrapper status; do not send transactions.\n  --yes              Required to submit mainnet transactions non-interactively.\n`);
}

const argv = process.argv.slice(2);
let ensRoot;
let requestedOwner;
let inspect = false;
let yes = false;
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === '--help') {
    usage();
    process.exit(0);
  } else if (arg === '--root') {
    ensRoot = argv[++i];
  } else if (arg === '--owner') {
    requestedOwner = argv[++i];
  } else if (arg === '--inspect') {
    inspect = true;
  } else if (arg === '--yes') {
    yes = true;
  } else {
    throw new Error(`Unexpected argument: ${arg}`);
  }
}

function readEnv(file) {
  const out = new Map();
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) out.set(match[1], match[2]);
  }
  return out;
}

async function requireConfirm(message) {
  if (yes) return;
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} Type yes to continue: `, (answer) => {
      rl.close();
      if (answer.trim() !== 'yes') reject(new Error('Aborted.'));
      else resolve();
    });
  });
}

function formatEth(wei) {
  return `${(Number(wei) / 1e18).toFixed(6)} ETH`;
}

async function estimateAndConfirm(label, contractParams) {
  const [gasEstimate, fees] = await Promise.all([
    publicClient.estimateContractGas({ account, ...contractParams }),
    publicClient.estimateFeesPerGas(),
  ]);
  const gasPrice = fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
  if (gasPrice === 0n) throw new Error('Gas price is 0 — RPC may be unreliable. Set MAINNET_RPC_URL in .env.secrets and retry.');
  const estimatedCost = gasEstimate * gasPrice;
  const gweiStr = gasPrice >= BigInt(1e9)
    ? `${gasPrice / BigInt(1e9)} gwei`
    : `${(Number(gasPrice) / 1e9).toFixed(4)} gwei`;
  console.log(`  Estimated: ${gasEstimate.toLocaleString()} gas @ ${gweiStr} ≈ ${formatEth(estimatedCost)}`);
  requireConfirm(`  Submit transaction for ${label}?`);
  return { gasEstimate, fees };
}

async function reportCost(receipt) {
  const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
  console.log(`  Gas used:  ${receipt.gasUsed.toLocaleString()} @ ${receipt.effectiveGasPrice / BigInt(1e9)} gwei = ${formatEth(actualCost)}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
ensRoot = normalize(ensRoot ?? manifest.ensRoot);
const testnetName = normalize(`testnet.${ensRoot}`);
const uiSlugs = manifest.domains.map((domain) => domain.slug);
const allNames = [ensRoot, testnetName, ...uiSlugs.map((slug) => normalize(`${slug}.${testnetName}`))];

const env = readEnv(secretsPath);
const privateKey = env.get('ENS_OWNER_PRIVATE_KEY');
if (!privateKey) throw new Error(`ENS_OWNER_PRIVATE_KEY is required in ${secretsPath}`);
const rpcUrl = env.get('MAINNET_RPC_URL') || 'https://eth.llamarpc.com';
const account = privateKeyToAccount(privateKey);
const targetOwner = requestedOwner ? getAddress(requestedOwner) : account.address;
if (!isAddress(targetOwner)) throw new Error(`Invalid --owner address: ${requestedOwner}`);

const publicClient = createPublicClient({ chain: mainnet, transport: http(rpcUrl, { timeout: 30_000 }) });
const walletClient = createWalletClient({ account, chain: mainnet, transport: http(rpcUrl, { timeout: 30_000 }) });

function tokenId(name) {
  return BigInt(namehash(name));
}

async function registryOwner(name) {
  return publicClient.readContract({ address: ENS_REGISTRY, abi: REGISTRY_ABI, functionName: 'owner', args: [namehash(name)] });
}

async function registryResolver(name) {
  return publicClient.readContract({ address: ENS_REGISTRY, abi: REGISTRY_ABI, functionName: 'resolver', args: [namehash(name)] });
}

async function wrapperOwner(name) {
  try {
    return await publicClient.readContract({ address: NAME_WRAPPER, abi: WRAPPER_ABI, functionName: 'ownerOf', args: [tokenId(name)] });
  } catch {
    return zeroAddress;
  }
}

function isSame(a, b) {
  return getAddress(a) === getAddress(b);
}

async function status(name) {
  const [regOwner, wrapOwner, resolver] = await Promise.all([registryOwner(name), wrapperOwner(name), registryResolver(name)]);
  const wrapped = isSame(regOwner, NAME_WRAPPER) && !isSame(wrapOwner, zeroAddress);
  return { name, regOwner, wrapOwner, resolver, wrapped, exists: !isSame(regOwner, zeroAddress) };
}

async function printStatus() {
  for (const name of allNames) {
    const s = await status(name);
    console.log(`${name}`);
    console.log(`  registry owner: ${s.regOwner}${s.wrapped ? ' (Name Wrapper)' : ''}`);
    console.log(`  wrapper owner:  ${s.wrapOwner}`);
    console.log(`  resolver:       ${s.resolver}`);
    console.log(`  status:         ${s.exists ? (s.wrapped ? 'wrapped' : 'unwrapped') : 'missing'}`);
  }
}

console.log(`ENS root:      ${ensRoot}`);
console.log(`Testnet name:  ${testnetName}`);
console.log(`Owner wallet:  ${account.address}`);
console.log(`Subname owner: ${targetOwner}`);
console.log(`Resolver:      ${PUBLIC_RESOLVER}`);
console.log(`RPC:           ${rpcUrl}`);
console.log('');

if (inspect) {
  await printStatus();
  process.exit(0);
}

const balance = await publicClient.getBalance({ address: account.address });
console.log(`Owner balance: ${formatEth(balance)}`);
if (balance === 0n) throw new Error('ENS owner wallet has 0 ETH — fund it with mainnet ETH before continuing.');
console.log('');

console.log(`Planning to create/update ${uiSlugs.length + 1} subdomains. Each will be confirmed individually.\n`);

async function createOrUpdate(parentName, label) {
  const childName = normalize(`${label}.${parentName}`);
  const parent = await status(parentName);
  const child = await status(childName);
  if (!parent.exists) throw new Error(`${parentName} does not exist in ENS. If this is a DNS name, import it into ENS first.`);
  if (child.exists && isSame(child.resolver, PUBLIC_RESOLVER) && (isSame(child.regOwner, targetOwner) || isSame(child.wrapOwner, targetOwner))) {
    console.log(`Already configured: ${childName}`);
    return;
  }

  const verb = parent.wrapped ? 'wrapped' : 'unwrapped';
  console.log(`Creating/updating ${verb} subname: ${childName}`);

  let contractParams;
  let hash;
  if (parent.wrapped) {
    contractParams = {
      address: NAME_WRAPPER,
      abi: WRAPPER_ABI,
      functionName: 'setSubnodeRecord',
      args: [namehash(parentName), label, targetOwner, PUBLIC_RESOLVER, 0n, 0, MAX_EXPIRY],
    };
  } else {
    contractParams = {
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'setSubnodeRecord',
      args: [namehash(parentName), labelhash(label), targetOwner, PUBLIC_RESOLVER, 0n],
    };
  }

  const { gasEstimate, fees } = await estimateAndConfirm(childName, contractParams);
  console.log('  Sending transaction...');
  hash = await walletClient.writeContract({ ...contractParams, gas: gasEstimate, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });
  console.log(`  tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`Transaction reverted: ${hash}`);
  await reportCost(receipt);
  console.log('');
}

await createOrUpdate(ensRoot, 'testnet');
for (const slug of uiSlugs) await createOrUpdate(testnetName, slug);

console.log('\nENS subdomain setup complete. Current status:');
await printStatus();
