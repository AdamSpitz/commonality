import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEther, type Address, type Hex } from 'viem';
import type { CampaignContracts, CampaignEnvironment, CampaignWalletBinding } from './campaignEnvironment.js';
import type { CampaignPlan, PlannedAction } from './campaignPlanner.js';
import { campaignFundProjectCost } from './paymentTokenUnits.js';
import { createSeedClients } from './seedRpc.js';

const GAS_UNITS: Record<PlannedAction['type'], bigint> = {
  'publish-statement': 180_000n, 'create-cause': 120_000n, 'set-belief': 90_000n,
  'attest-implication': 130_000n, 'create-project': 1_100_000n, 'attest-alignment': 130_000n,
  'fund-project': 180_000n, 'deposit-note': 150_000n, 'delegate-note': 100_000n, 'revoke-delegation': 90_000n,
};

const DEFAULT_GAS_PRICE = 1_000_000_000n;
const NATIVE_BUFFER_WEI = parseEther('0.05');


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

export function computeCampaignFundingNeeds(plan: CampaignPlan, wallets: readonly CampaignWalletBinding[], gasPrice = DEFAULT_GAS_PRICE): CampaignWalletNeed[] {
  const users = new Map(plan.users.map((user) => [user.id, user]));
  const bySlot = new Map<string, CampaignWalletNeed>();
  for (const wallet of wallets) {
    bySlot.set(wallet.walletSlot, { walletSlot: wallet.walletSlot, address: wallet.address, nativeWei: NATIVE_BUFFER_WEI, paymentTokenUnits: 0n });
  }
  const fundCost = campaignFundProjectCost();
  for (const action of plan.actions) {
    const user = action.actorUserId ? users.get(action.actorUserId) : undefined;
    if (!user) continue;
    const need = bySlot.get(user.walletSlot);
    if (!need) continue;
    need.nativeWei += GAS_UNITS[action.type] * gasPrice;
    if (action.type === 'deposit-note') need.nativeWei += noteDepositWei(action);
    if (action.type === 'fund-project') need.paymentTokenUnits += fundCost;
  }
  return [...bySlot.values()];
}

export async function provisionCampaignWallets(input: {
  environment: CampaignEnvironment;
  plan: CampaignPlan;
  wallets: readonly CampaignWalletBinding[];
  chain: CampaignFundingChain;
  ledgerPath: string;
}): Promise<CampaignFundingLedger> {
  if (input.environment.mode === 'remote' && input.wallets.some((wallet) => wallet.source === 'hardhat')) {
    throw new Error('remote campaign provisioning refuses Hardhat wallets');
  }
  const needs = computeCampaignFundingNeeds(input.plan, input.wallets);
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
