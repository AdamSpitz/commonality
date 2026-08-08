/**
 * User actions for LazyGiving subsystem
 */

import { type Address, type Hash, type Abi, parseEventLogs, encodeFunctionData, numberToHex } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';
import {
  PremintingERC1155Abi,
  PremintingERC1155FactoryAbi,
  AssuranceContractFactoryAbi
} from '../../abis.js';
import { IpfsCidV1 } from '../../utils/cid-types.js';

// ============================================================================
// LazyGiving Actions
// ============================================================================

export interface ProjectFactoryContract {
  address: Address;
  abi: Abi;
}

export interface AssuranceContract {
  address: Address;
  abi: Abi;
}

export interface ProjectDetails {
  tokenAddress: Address;
  marketplaceAddress: Address | null;
  assuranceContractAddress: Address;
}

/** Current ProjectFactory create entrypoint (post secondary-market removal). */
const PROJECT_FACTORY_CREATE_FN =
  'createERC1155AndAssuranceContract' as const;

/**
 * Enrich empty/opaque createProject reverts with a redeploy hint when the
 * on-chain ProjectFactory still exposes only the pre-rename marketplace entrypoint.
 * Exported for unit tests.
 */
export function enhanceCreateProjectError(err: unknown, factoryAddress?: Address): Error {
  const base = err instanceof Error ? err : new Error(String(err));
  const msg = base.message || String(err);
  const looksLikeOpaqueRevert =
    /execution reverted/i.test(msg)
    && !/Invalid(Deadline|Threshold|Owner|Recipient|Factory)|EmptyTokenList|ZeroPrice|TokenArrayLengthMismatch/i.test(msg);

  if (!looksLikeOpaqueRevert) {
    return base;
  }

  const hint =
    `createProject failed against ProjectFactory${factoryAddress ? ` at ${factoryAddress}` : ''}. `
    + `If this is a local stack, the factory may still be the legacy ABI `
    + `(createERC1155AndMarketplaceAndAssuranceContract) while the SDK calls `
    + `${PROJECT_FACTORY_CREATE_FN}. Redeploy contracts from the current tree `
    + `(\`./scripts/deploy-contracts.sh localhost\`), then republish UIs / recreate CauseStarter. `
    + `Verify with \`./scripts/check-local-config-sync.sh\`. `
    + `Original error: ${msg}`;

  const enhanced = new Error(hint);
  enhanced.cause = base;
  return enhanced;
}

const erc20ApproveAbi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const paymentTokenGetterAbi = [
  {
    inputs: [],
    name: 'paymentToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function hasSufficientERC20Allowance(
  clients: WriteClients,
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<boolean> {
  // @ts-expect-error - viem type inference issue with readContract
  const currentAllowance = await clients.publicClient.readContract({
    address: token,
    abi: erc20ApproveAbi,
    functionName: 'allowance',
    args: [clients.account, spender],
  }) as bigint;
  return currentAllowance >= amount;
}

async function approveERC20Spend(
  clients: WriteClients,
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<void> {
  if (await hasSufficientERC20Allowance(clients, token, spender, amount)) return;
  const approvalHash = await clients.walletClient.writeContract({
    address: token,
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [spender, amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: approvalHash });
}

async function sendAtomicContractCalls(
  clients: WriteClients,
  calls: readonly { to: Address; abi: Abi; functionName: string; args: readonly unknown[] }[],
): Promise<Hash> {
  const chainId = clients.walletClient.chain?.id;
  if (!chainId) throw new Error('Atomic transactions require a configured wallet chain.');
  const id = await clients.walletClient.request({
    method: 'wallet_sendCalls',
    params: [{
      version: '2.0.0',
      chainId: numberToHex(chainId),
      from: clients.account,
      atomicRequired: true,
      calls: calls.map(({ to, abi, functionName, args }) => ({
        to,
        data: encodeFunctionData({ abi, functionName, args }),
      })),
    }],
  });
  const batchId = typeof id === 'string' ? id : (id as { id: string }).id;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const status = await clients.walletClient.request({
      method: 'wallet_getCallsStatus',
      params: [batchId],
    }) as { status: number; receipts?: { transactionHash?: Hash }[] };
    if (status.status === 200) {
      const hash = status.receipts?.[0]?.transactionHash;
      if (!hash) throw new Error('Atomic transaction completed without a transaction hash.');
      return hash;
    }
    if (status.status >= 300) throw new Error('Atomic transaction failed.');
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error('Timed out waiting for atomic transaction confirmation.');
}

/**
 * Create a new crowdfunding project with ERC1155 receipt tokens and an assurance contract.
 *
 * Securities-redesign projects no longer deploy a per-project secondary marketplace; receipts are
 * non-transferable and later donations use the reimbursement flow instead of resale.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param projectFactoryContract - The ProjectFactory contract instance
 * @param params - Project creation parameters
 * @param params.metadataURI - Base URI for token metadata
 * @param params.contractURI - Contract-level metadata URI
 * @param params.owner - Owner of the token contract
 * @param params.recipient - Address that will receive funds if project succeeds
 * @param params.threshold - Minimum funding amount required for project success
 * @param params.deadline - Unix timestamp deadline for the funding campaign
 * @param params.projectMetadataCid - IPFS CID for project metadata
 * @param params.tokenIds - Token IDs to create
 * @param params.tokenCounts - Supply for each token ID
 * @param params.tokenPrices - Price for each token ID (in wei)
 * @returns Transaction hash and addresses of created contracts
 *
 * @example
 * ```typescript
 * const { projectDetails } = await createProject(clients, projectFactory, {
 *   metadataURI: 'ipfs://...',
 *   contractURI: 'ipfs://...',
 *   owner: alice.address,
 *   recipient: alice.address,
 *   threshold: parseEther('10'),
 *   deadline: BigInt(Date.now() / 1000 + 86400 * 30),
 *   projectMetadataCid: 'bafy...',
 *   tokenIds: [0n],
 *   tokenCounts: [100n],
 *   tokenPrices: [parseEther('0.1')]
 * });
 * ```
 */
export async function createProject(
  clients: WriteClients,
  projectFactoryContract: ProjectFactoryContract,
  params: {
    metadataURI: string;
    contractURI: string;
    owner: Address;
    recipient: Address;
    paymentToken?: Address;
    threshold: bigint;
    deadline: bigint;
    projectMetadataCid: IpfsCidV1;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    tokenPrices: bigint[];
    /** Optional per-token ERC-1155 metadata URIs. When present, each URI is installed after deployment so uri(id) resolves standard metadata. */
    tokenMetadataURIs?: string[];
  }
): Promise<{ hash: Hash; projectDetails: ProjectDetails }> {
  if (!params.paymentToken) {
    throw new Error('createProject requires a paymentToken address');
  }

  // Only wrap factory simulate/write with the legacy-ABI redeploy hint.
  // setTokenURI / log-parse failures must not look like a ProjectFactory ABI mismatch.
  let hash: Hash;
  try {
    // Simulate first so ABI/dispatcher mismatches fail before a sent tx, with a clear message.
    await clients.publicClient.simulateContract({
      address: projectFactoryContract.address,
      abi: projectFactoryContract.abi,
      functionName: PROJECT_FACTORY_CREATE_FN,
      args: [
        params.metadataURI,
        params.contractURI,
        params.owner,
        params.recipient,
        params.paymentToken,
        params.threshold,
        params.deadline,
        params.projectMetadataCid,
        params.tokenIds,
        params.tokenCounts,
        params.tokenPrices,
      ],
      account: clients.walletClient.account!,
    });

    hash = await clients.walletClient.writeContract({
      address: projectFactoryContract.address,
      abi: projectFactoryContract.abi,
      functionName: PROJECT_FACTORY_CREATE_FN,
      args: [
        params.metadataURI,
        params.contractURI,
        params.owner,
        params.recipient,
        params.paymentToken,
        params.threshold,
        params.deadline,
        params.projectMetadataCid,
        params.tokenIds,
        params.tokenCounts,
        params.tokenPrices,
      ],
      chain: clients.walletClient.chain,
      account: clients.walletClient.account!,
    });
  } catch (err) {
    throw enhanceCreateProjectError(err, projectFactoryContract.address);
  }

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse the events to get the created contract addresses using viem's parseEventLogs
  const tokenEvents = parseEventLogs({
    abi: PremintingERC1155FactoryAbi,
    eventName: 'LazyGivingERC1155ContractCreated',
    logs: receipt.logs,
  });

  const assuranceEvents = parseEventLogs({
    abi: AssuranceContractFactoryAbi,
    eventName: 'LazyGivingAssuranceContractCreated',
    logs: receipt.logs,
  });

  if (tokenEvents.length === 0 || assuranceEvents.length === 0) {
    throw new Error(`Failed to extract contract addresses from transaction logs. Found: ${tokenEvents.length} token events, ${assuranceEvents.length} assurance events`);
  }

  const tokenAddress = tokenEvents[0].args.erc1155;
  const marketplaceAddress = null;
  const assuranceContractAddress = assuranceEvents[0].args.assuranceContract;

  if (params.tokenMetadataURIs) {
    if (params.tokenMetadataURIs.length !== params.tokenIds.length) {
      throw new Error('tokenMetadataURIs length must match tokenIds length');
    }

    for (let i = 0; i < params.tokenIds.length; i++) {
      if (!params.tokenMetadataURIs[i]) continue;
      const setUriHash = await clients.walletClient.writeContract({
        address: tokenAddress,
        abi: PremintingERC1155Abi,
        functionName: 'setTokenURI',
        args: [params.tokenIds[i], params.tokenMetadataURIs[i]],
        chain: clients.walletClient.chain,
        account: clients.walletClient.account!,
      });
      await clients.publicClient.waitForTransactionReceipt({ hash: setUriHash });
    }
  }

  return {
    hash,
    projectDetails: {
      tokenAddress,
      marketplaceAddress,
      assuranceContractAddress,
    },
  };
}

/**
 * Buy tokens from a project's assurance contract
 *
 * Purchases tokens from a crowdfunding project's primary market. Funds are held in escrow
 * until the project reaches its threshold or the deadline passes.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param assuranceContract - The project's assurance contract instance
 * @param params - Purchase parameters
 * @param params.buyer - Address that will receive the tokens
 * @param params.tokenAddress - Address of the project's ERC1155 token contract
 * @param params.tokenIds - Token IDs to purchase
 * @param params.tokenCounts - Quantity for each token ID
 * @param params.totalCost - Total cost in payment-token units
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await buyProjectTokens(clients, assuranceContract, {
 *   buyer: bob.address,
 *   tokenAddress: projectDetails.tokenAddress,
 *   tokenIds: [0n],
 *   tokenCounts: [10n],
 *   totalCost: parseEther('1.0')
 * });
 * ```
 */
export async function buyProjectTokens(
  clients: WriteClients,
  assuranceContract: AssuranceContract,
  params: {
    buyer: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    totalCost: bigint;
    /** Submit a required approval and purchase as one EIP-5792 atomic batch. */
    batchApproval?: boolean;
  }
): Promise<Hash> {
  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: assuranceContract.address,
    abi: paymentTokenGetterAbi,
    functionName: 'paymentToken',
  }) as Address;
  const hasAllowance = await hasSufficientERC20Allowance(
    clients, paymentToken, assuranceContract.address, params.totalCost,
  );
  const buyArgs = [params.buyer, params.tokenAddress, params.tokenIds, params.tokenCounts, '0x'] as const;

  if (!hasAllowance && params.batchApproval) {
    return sendAtomicContractCalls(clients, [
      { to: paymentToken, abi: erc20ApproveAbi, functionName: 'approve', args: [assuranceContract.address, params.totalCost] },
      { to: assuranceContract.address, abi: assuranceContract.abi, functionName: 'buyERC1155', args: buyArgs },
    ]);
  }
  if (!hasAllowance) await approveERC20Spend(clients, paymentToken, assuranceContract.address, params.totalCost);

  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'buyERC1155',
    args: buyArgs,
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Contribute while atomically waiving the resulting reimbursement claim.
 * The contributor keeps the permanent recognition receipt.
 */
export async function donateNormally(
  clients: WriteClients,
  assuranceContract: AssuranceContract,
  params: {
    buyer: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    totalCost: bigint;
  }
): Promise<Hash> {
  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: assuranceContract.address,
    abi: paymentTokenGetterAbi,
    functionName: 'paymentToken',
  }) as Address;

  await approveERC20Spend(clients, paymentToken, assuranceContract.address, params.totalCost);

  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'donateNormallyERC1155',
    args: [
      params.buyer,
      params.tokenAddress,
      params.tokenIds,
      params.tokenCounts,
      '0x',
    ],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function donateRetroactive(
  clients: WriteClients,
  assuranceContract: AssuranceContract,
  amount: bigint,
): Promise<Hash> {
  // @ts-expect-error - viem type inference issue with readContract
  const paymentToken = await clients.publicClient.readContract({
    address: assuranceContract.address,
    abi: paymentTokenGetterAbi,
    functionName: 'paymentToken',
  }) as Address;

  await approveERC20Spend(clients, paymentToken, assuranceContract.address, amount);

  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'donateRetroactive',
    args: [amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Withdraw the caller's currently available at-cost reimbursement. */
export async function withdrawReimbursement(
  clients: WriteClients,
  assuranceContract: AssuranceContract,
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'withdrawReimbursement',
    args: [],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Permanently waive part or all of the caller's reimbursement claim. */
export async function forgoReimbursement(
  clients: WriteClients,
  assuranceContract: AssuranceContract,
  amount: bigint,
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'forgoReimbursement',
    args: [amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function refundProjectTokens(
  clients: WriteClients,
  assuranceContract: AssuranceContract,
  params: {
    holder: Address;
    tokenAddress: Address;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    /** Submit setApprovalForAll and refund as one EIP-5792 atomic batch. */
    batchApproval?: boolean;
  }
): Promise<Hash> {
  const refundArgs = [params.holder, params.tokenAddress, params.tokenIds, params.tokenCounts, '0x'] as const;
  if (params.batchApproval) {
    return sendAtomicContractCalls(clients, [
      {
        to: params.tokenAddress,
        abi: erc1155OperatorApprovalAbi,
        functionName: 'setApprovalForAll',
        args: [assuranceContract.address, true],
      },
      { to: assuranceContract.address, abi: assuranceContract.abi, functionName: 'refundERC1155', args: refundArgs },
    ]);
  }

  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'refundERC1155',
    args: refundArgs,
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Withdraw funds from a successful project
 */
export async function withdrawProjectFunds(
  clients: WriteClients,
  assuranceContract: AssuranceContract
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: assuranceContract.address,
    abi: assuranceContract.abi,
    functionName: 'withdraw',
    args: [],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Approve an operator to transfer the caller's ERC1155 tokens.
 */
const erc1155OperatorApprovalAbi = [
    {
      inputs: [
        { name: 'operator', type: 'address' },
        { name: 'approved', type: 'bool' },
      ],
      name: 'setApprovalForAll',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

export async function approveERC1155ForOperator(
  clients: WriteClients,
  tokenAddress: Address,
  operatorAddress: Address
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: tokenAddress,
    abi: erc1155OperatorApprovalAbi,
    functionName: 'setApprovalForAll',
    args: [operatorAddress, true],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
