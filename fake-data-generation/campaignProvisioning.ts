import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEther, type Address, type Hex } from 'viem';
import type { CampaignContracts, CampaignEnvironment, CampaignWalletBinding } from './campaignEnvironment.js';
import type { CampaignPlan, PlannedAction } from './campaignPlanner.js';
import { estimateGroupGas, groupCampaignWrites } from './campaignBatching.js';
import { campaignFundProjectCost } from './paymentTokenUnits.js';
import { createSeedClients } from './seedRpc.js';

const DEFAULT_GAS_PRICE = 1_000_000_000n;
// Keep a small floor for transaction price changes, then scale headroom with
// the work assigned to each wallet. A fixed 0.001 ETH per user strands 0.1 ETH
// in a 100-user run before accounting for any actual transaction cost.
const MIN_GAS_BUFFER_WEI = parseEther('0.0001');
const GAS_BUFFER_PERCENT = 25n;


export const PAYMENT_TOKEN_FUNDING_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'mintTo',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export interface CampaignWalletNeed {
  walletSlot: string;
  address: Address;
  nativeWei: bigint;
  paymentTokenUnits: bigint;
}

export interface CampaignFundingLedger {
  campaignId: string;
  mode: CampaignEnvironment['mode'];
  paymentTokenStrategy: CampaignEnvironment['provisioning']['paymentTokenStrategy'];
  wallets: Array<{
    walletSlot: string;
    address: Address;
    nativeWei: string;
    paymentTokenUnits: string;
    nativeTransferred: boolean;
    paymentTokenMethod: 'none' | 'skipped' | 'transfer' | 'mint';
  }>;
}

export interface CampaignFundingChain {
  getNativeBalance(address: Address): Promise<bigint>;
  getTokenBalance(address: Address): Promise<bigint>;
  transferNative(to: Address, amount: bigint): Promise<Hex>;
  transferToken(to: Address, amount: bigint): Promise<Hex>;
  mintToken?(to: Address, amount: bigint): Promise<Hex>;
}

function noteDepositWei(action: PlannedAction): bigint {
  return parseEther((Math.max(1, action.amount ?? 1) / 100_000).toString());
}

export function computeCampaignFundingNeeds(plan: CampaignPlan, wallets: readonly CampaignWalletBinding[], gasPrice = DEFAULT_GAS_PRICE, options: { batchPublishes?: boolean } = {}): CampaignWalletNeed[] {
  const users = new Map(plan.users.map((user) => [user.id, user]));
  const bySlot = new Map<string, CampaignWalletNeed>();
  const gasBySlot = new Map<string, bigint>();
  for (const wallet of wallets) {
    bySlot.set(wallet.walletSlot, { walletSlot: wallet.walletSlot, address: wallet.address, nativeWei: 0n, paymentTokenUnits: 0n });
  }
  const fundCost = campaignFundProjectCost();
  for (const group of groupCampaignWrites(plan.actions, options)) {
    const actorUserId = group[0].actorUserId;
    const user = actorUserId ? users.get(actorUserId) : undefined;
    if (!user) continue;
    const need = bySlot.get(user.walletSlot);
    if (!need) continue;
    const gasWei = estimateGroupGas(group) * gasPrice;
    need.nativeWei += gasWei;
    gasBySlot.set(user.walletSlot, (gasBySlot.get(user.walletSlot) ?? 0n) + gasWei);
    for (const action of group) {
      if (action.type === 'deposit-note') need.nativeWei += noteDepositWei(action);
      if (action.type === 'fund-project') need.paymentTokenUnits += fundCost;
    }
  }
  return [...bySlot.values()].map((need) => {
    // Deposits are principal, not gas; apply the percentage only to estimated gas.
    const gasWei = gasBySlot.get(need.walletSlot) ?? 0n;
    const bufferWei = gasWei > 0n ? MIN_GAS_BUFFER_WEI + gasWei * GAS_BUFFER_PERCENT / 100n : 0n;
    return { ...need, nativeWei: need.nativeWei + bufferWei };
  });
}

export async function provisionCampaignWallets(input: {
  environment: CampaignEnvironment;
  plan: CampaignPlan;
  wallets: readonly CampaignWalletBinding[];
  chain: CampaignFundingChain;
  ledgerPath: string;
  batchPublishes?: boolean;
  gasPrice?: bigint;
}): Promise<CampaignFundingLedger> {
  if (input.environment.mode === 'remote' && input.wallets.some((wallet) => wallet.source === 'hardhat')) {
    throw new Error('remote campaign provisioning refuses Hardhat wallets');
  }
  const needs = computeCampaignFundingNeeds(input.plan, input.wallets, input.gasPrice, { batchPublishes: input.batchPublishes });
  const ledger: CampaignFundingLedger = {
    campaignId: input.plan.campaignId,
    mode: input.environment.mode,
    paymentTokenStrategy: input.environment.provisioning.paymentTokenStrategy,
    wallets: [],
  };
  for (const need of needs) {
    const nativeBalance = await input.chain.getNativeBalance(need.address);
    let nativeTransferred = false;
    if (nativeBalance < need.nativeWei) {
      await input.chain.transferNative(need.address, need.nativeWei - nativeBalance);
      nativeTransferred = true;
    }
    let paymentTokenMethod: CampaignFundingLedger['wallets'][number]['paymentTokenMethod'] = 'none';
    if (need.paymentTokenUnits > 0n) {
      const tokenBalance = await input.chain.getTokenBalance(need.address);
      if (tokenBalance >= need.paymentTokenUnits) {
        paymentTokenMethod = 'skipped';
      } else {
        const deficit = need.paymentTokenUnits - tokenBalance;
        try {
          await input.chain.transferToken(need.address, deficit);
          paymentTokenMethod = 'transfer';
        } catch (error) {
          if (input.environment.provisioning.paymentTokenStrategy !== 'transfer-or-mint' || !input.chain.mintToken) {
            throw error;
          }
          await input.chain.mintToken(need.address, deficit);
          paymentTokenMethod = 'mint';
        }
      }
    }
    ledger.wallets.push({
      walletSlot: need.walletSlot,
      address: need.address,
      nativeWei: need.nativeWei.toString(),
      paymentTokenUnits: need.paymentTokenUnits.toString(),
      nativeTransferred,
      paymentTokenMethod,
    });
  }
  await mkdir(path.dirname(input.ledgerPath), { recursive: true });
  await writeFile(input.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

export function createLiveCampaignFundingChain(input: {
  funderPrivateKey: Hex;
  contracts: CampaignContracts;
}): CampaignFundingChain {
  const clients = createSeedClients(input.funderPrivateKey);
  const token = { address: input.contracts.paymentToken, abi: PAYMENT_TOKEN_FUNDING_ABI };
  const wait = async (hash: Hex) => {
    await clients.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  };
  return {
    getNativeBalance: (address) => clients.publicClient.getBalance({ address }),
    getTokenBalance: (address) => clients.publicClient.readContract({ ...token, functionName: 'balanceOf', args: [address] }),
    async transferNative(to, amount) {
      return wait(await clients.walletClient.sendTransaction({ to, value: amount }));
    },
    async transferToken(to, amount) {
      return wait(await clients.walletClient.writeContract({
        ...token, functionName: 'transfer', args: [to, amount],
        chain: clients.walletClient.chain, account: clients.walletClient.account!,
      }));
    },
    async mintToken(to, amount) {
      return wait(await clients.walletClient.writeContract({
        ...token, functionName: 'mintTo', args: [to, amount],
        chain: clients.walletClient.chain, account: clients.walletClient.account!,
      }));
    },
  };
}
