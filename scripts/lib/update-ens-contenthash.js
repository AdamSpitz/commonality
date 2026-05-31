// Update an ENS name's contenthash to point to either an IPFS CID or an IPNS name.
//
// Environment variables (all required):
//   ENS_NAME              - ENS name (e.g. "alignment.testnet.commonality.eth")
//   TARGET                - Either an IPFS CID ("Qm..." / "bafy...") or an IPNS
//                           name ("k51..."). May optionally be prefixed with
//                           "ipfs://" or "ipns://"; the prefix forces the
//                           namespace if the bare value would be ambiguous.
//   ENS_OWNER_PRIVATE_KEY - Private key of the ENS name owner
//   RPC_URL               - Ethereum RPC URL
//   NETWORK               - "mainnet" or "sepolia"

import { createPublicClient, createWalletClient, http, toHex } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { namehash, normalize } from 'viem/ens';
import { parseCidToV1Bytes, parseIpnsNameToBytes } from './cid-utils.js';

const ensName = process.env.ENS_NAME;
const target = process.env.TARGET;
const privateKey = process.env.ENS_OWNER_PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const network = process.env.NETWORK;

if (!ensName || !target || !privateKey || !rpcUrl || !network) {
  console.error('Missing required environment variables.');
  console.error('Required: ENS_NAME, TARGET, ENS_OWNER_PRIVATE_KEY, RPC_URL, NETWORK');
  process.exit(1);
}

// Determine namespace: explicit prefix wins, otherwise infer from the value's
// multibase prefix. IPNS names are CIDv1 libp2p-key (typically 'k...' base36);
// IPFS CIDs are 'Qm...' (v0) or 'bafy...' (v1 dag-pb base32).
let namespace; // 0xe3 = IPFS, 0xe5 = IPNS (EIP-1577)
let payload;
let value = target;

if (value.startsWith('ipfs://')) {
  namespace = 0xe3;
  payload = parseCidToV1Bytes(value.slice('ipfs://'.length));
} else if (value.startsWith('ipns://')) {
  namespace = 0xe5;
  payload = parseIpnsNameToBytes(value.slice('ipns://'.length));
} else if (value.startsWith('k')) {
  namespace = 0xe5;
  payload = parseIpnsNameToBytes(value);
} else if (value.startsWith('Qm') || value.startsWith('bafy') || value.startsWith('bafk')) {
  namespace = 0xe3;
  payload = parseCidToV1Bytes(value);
} else {
  console.error(`Cannot determine namespace for TARGET="${value}".`);
  console.error('Use an explicit "ipfs://" or "ipns://" prefix.');
  process.exit(1);
}

const contenthash = new Uint8Array([namespace, ...payload]);
const contenthashHex = toHex(contenthash);

const namespaceLabel = namespace === 0xe3 ? 'ipfs' : 'ipns';
console.log(`Encoded contenthash (${namespaceLabel}): ${contenthashHex}`);

const chain = network === 'mainnet' ? mainnet : sepolia;
const account = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

const normalizedName = normalize(ensName);
const node = namehash(normalizedName);

const resolverAddress = await publicClient.getEnsResolver({ name: normalizedName });

console.log(`Resolver: ${resolverAddress}`);
console.log(`Node:     ${node}`);

const RESOLVER_ABI = [
  {
    name: 'setContenthash',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'hash', type: 'bytes' },
    ],
    outputs: [],
  },
];

const contractParams = {
  address: resolverAddress,
  abi: RESOLVER_ABI,
  functionName: 'setContenthash',
  args: [node, contenthashHex],
};

const [gasEstimate, gasPrice] = await Promise.all([
  publicClient.estimateContractGas({ account, ...contractParams }),
  publicClient.getGasPrice(),
]);
const estimatedCost = gasEstimate * gasPrice;
console.log(`Estimated: ${gasEstimate.toLocaleString()} gas @ ${gasPrice / BigInt(1e9)} gwei ≈ ${(Number(estimatedCost) / 1e18).toFixed(6)} ETH`);

const txHash = await walletClient.writeContract(contractParams);

console.log(`Transaction submitted: ${txHash}`);
console.log('Waiting for confirmation...');

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

if (receipt.status === 'success') {
  const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
  console.log('');
  console.log('ENS contenthash updated successfully!');
  console.log(`  Transaction: ${txHash}`);
  console.log(`  Block:       ${receipt.blockNumber}`);
  console.log(`  Gas used:    ${receipt.gasUsed.toLocaleString()} @ ${receipt.effectiveGasPrice / BigInt(1e9)} gwei = ${(Number(actualCost) / 1e18).toFixed(6)} ETH`);
  console.log('');
  // eth.limo resolves any depth of subdomain; strip the trailing ".eth" only.
  const limoHost = ensName.replace(/\.eth$/, '') + '.eth.limo';
  console.log(`The UI is accessible at: https://${limoHost}`);
  if (namespace === 0xe5) {
    console.log('(Pointer is IPNS — future deploys can update without another ENS transaction.)');
  }
} else {
  console.error('Transaction reverted!');
  console.error(`  Transaction: ${txHash}`);
  process.exit(1);
}
