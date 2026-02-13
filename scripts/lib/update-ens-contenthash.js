// Update an ENS name's contenthash to point to an IPFS CID.
//
// Environment variables (all required):
//   ENS_NAME              - ENS name (e.g. "commonality.eth")
//   IPFS_CID              - IPFS CID (CIDv0 "Qm..." or CIDv1 "bafy...")
//   ENS_OWNER_PRIVATE_KEY - Private key of the ENS name owner
//   RPC_URL               - Ethereum RPC URL
//   NETWORK               - "mainnet" or "sepolia"

import { createPublicClient, createWalletClient, http, toHex } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { namehash, normalize } from 'viem/ens';
import { CID } from 'multiformats/cid';

const ensName = process.env.ENS_NAME;
const ipfsCid = process.env.IPFS_CID;
const privateKey = process.env.ENS_OWNER_PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const network = process.env.NETWORK;

if (!ensName || !ipfsCid || !privateKey || !rpcUrl || !network) {
  console.error('Missing required environment variables.');
  console.error('Required: ENS_NAME, IPFS_CID, ENS_OWNER_PRIVATE_KEY, RPC_URL, NETWORK');
  process.exit(1);
}

const chain = network === 'mainnet' ? mainnet : sepolia;

const account = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
});

// Encode IPFS CID as ENS contenthash per EIP-1577:
// contenthash = 0xe3 (IPFS namespace) + CIDv1 binary bytes
const cidV1 = CID.parse(ipfsCid).toV1();
const contenthash = new Uint8Array([0xe3, ...cidV1.bytes]);
const contenthashHex = toHex(contenthash);

console.log(`Encoded contenthash: ${contenthashHex}`);

// Look up the resolver for this ENS name
const normalizedName = normalize(ensName);
const node = namehash(normalizedName);

const resolverAddress = await publicClient.getEnsResolver({
  name: normalizedName,
});

console.log(`Resolver: ${resolverAddress}`);
console.log(`Node:     ${node}`);

// Submit setContenthash transaction
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

const txHash = await walletClient.writeContract({
  address: resolverAddress,
  abi: RESOLVER_ABI,
  functionName: 'setContenthash',
  args: [node, contenthashHex],
});

console.log(`Transaction submitted: ${txHash}`);
console.log('Waiting for confirmation...');

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

if (receipt.status === 'success') {
  console.log('');
  console.log('ENS contenthash updated successfully!');
  console.log(`  Transaction: ${txHash}`);
  console.log(`  Block:       ${receipt.blockNumber}`);
  console.log('');
  console.log('The UI is accessible at:');
  console.log(`  https://${ensName.replace('.eth', '')}.eth.limo`);
} else {
  console.error('Transaction reverted!');
  console.error(`  Transaction: ${txHash}`);
  process.exit(1);
}
