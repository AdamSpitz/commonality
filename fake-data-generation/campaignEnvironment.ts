import { readFile } from 'node:fs/promises';
import { createPublicClient, http, isAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const LOCAL_HARDHAT_CHAIN_ID = 31_337;
export const BASE_SEPOLIA_CHAIN_ID = 84_532;

export const CAMPAIGN_CONTRACT_ENV_KEYS = {
  beliefs: 'BELIEFS_CONTRACT_ADDRESS',
  implications: 'IMPLICATIONS_CONTRACT_ADDRESS',
  alignmentAttestations: 'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
  delegatableNotes: 'DELEGATABLE_NOTES_CONTRACT_ADDRESS',
  projectFactory: 'PROJECT_FACTORY_ADDRESS',
  paymentToken: 'PAYMENT_TOKEN_ADDRESS',
  publishedData: 'PUBLISHED_DATA_CONTRACT_ADDRESS',
  mutableRefUpdater: 'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
} as const;

export type CampaignContractName = keyof typeof CAMPAIGN_CONTRACT_ENV_KEYS;
export type CampaignContracts = Record<CampaignContractName, Address>;

interface CampaignEnvironmentBase {
  rpcUrl: string;
  expectedChainId: number;
  contracts: CampaignContracts;
}

export interface LocalCampaignEnvironment extends CampaignEnvironmentBase {
  mode: 'local';
  deployment: { strategy: 'existing-or-deploy' };
  provisioning: { walletSource: 'generated-or-hardhat'; paymentTokenStrategy: 'transfer-or-mint' };
}

export interface RemoteCampaignEnvironment extends CampaignEnvironmentBase {
  mode: 'remote';
  deployment: { strategy: 'existing-only' };
  provisioning: { walletSource: 'generated-only'; paymentTokenStrategy: 'transfer-only' };
  mutationConfirmed: boolean;
}

export type CampaignEnvironment = LocalCampaignEnvironment | RemoteCampaignEnvironment;

export interface CampaignChainAdapter {
  getChainId(): Promise<number>;
  getBytecode(address: Address): Promise<Hex | undefined>;
}

export interface CampaignWalletBinding {
  walletSlot: string;
  address: Address;
  privateKey: Hex;
  source: 'generated' | 'hardhat';
}

export interface CampaignDeploymentAdapter {
  readonly strategy: CampaignEnvironment['deployment']['strategy'];
  prepare(environment: CampaignEnvironment): Promise<CampaignContracts>;
}

export interface CampaignProvisioningAdapter {
  readonly walletSource: CampaignEnvironment['provisioning']['walletSource'];
  readonly paymentTokenStrategy: CampaignEnvironment['provisioning']['paymentTokenStrategy'];
  provision(environment: CampaignEnvironment, wallets: readonly CampaignWalletBinding[]): Promise<void>;
}

export interface CampaignPreflightResult {
  mode: CampaignEnvironment['mode'];
  chainId: number;
  checkedContracts: CampaignContractName[];
}

export function createCampaignChainAdapter(rpcUrl: string): CampaignChainAdapter {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return {
    getChainId: () => client.getChainId(),
    getBytecode: (address) => client.getBytecode({ address }),
  };
}

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    values[key] = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, '$1$2');
  }
  return values;
}

function requireContracts(values: Record<string, string>): CampaignContracts {
  return Object.fromEntries(Object.entries(CAMPAIGN_CONTRACT_ENV_KEYS).map(([name, envKey]) => {
    const value = values[envKey];
    if (!value) throw new Error(`${envKey} is missing from the deployment manifest`);
    if (!isAddress(value)) throw new Error(`${envKey} is not a valid address`);
    return [name, value];
  })) as unknown as CampaignContracts;
}

export async function loadCampaignEnvironment(input: {
  mode: 'local' | 'remote';
  rpcUrl: string;
  expectedChainId: number;
  deploymentEnvPath: string;
  mutationConfirmed?: boolean;
}): Promise<CampaignEnvironment> {
  if (!input.rpcUrl.trim()) throw new Error('campaign RPC URL is required');
  if (!Number.isSafeInteger(input.expectedChainId) || input.expectedChainId <= 0) throw new Error('expected chain ID must be a positive integer');
  const contracts = requireContracts(parseEnvFile(await readFile(input.deploymentEnvPath, 'utf8')));
  if (input.mode === 'local') {
    if (input.expectedChainId !== LOCAL_HARDHAT_CHAIN_ID) throw new Error(`local campaign mode requires Hardhat chain ${LOCAL_HARDHAT_CHAIN_ID}`);
    return { mode: 'local', rpcUrl: input.rpcUrl, expectedChainId: input.expectedChainId, contracts, deployment: { strategy: 'existing-or-deploy' }, provisioning: { walletSource: 'generated-or-hardhat', paymentTokenStrategy: 'transfer-or-mint' } };
  }
  if (input.expectedChainId === LOCAL_HARDHAT_CHAIN_ID) throw new Error('remote campaign mode refuses the local Hardhat chain ID');
  return { mode: 'remote', rpcUrl: input.rpcUrl, expectedChainId: input.expectedChainId, contracts, mutationConfirmed: input.mutationConfirmed === true, deployment: { strategy: 'existing-only' }, provisioning: { walletSource: 'generated-only', paymentTokenStrategy: 'transfer-only' } };
}

export function validateCampaignAdapters(environment: CampaignEnvironment, deployment: CampaignDeploymentAdapter, provisioning: CampaignProvisioningAdapter): void {
  if (deployment.strategy !== environment.deployment.strategy) throw new Error(`deployment adapter strategy ${deployment.strategy} violates ${environment.mode} campaign policy ${environment.deployment.strategy}`);
  if (provisioning.walletSource !== environment.provisioning.walletSource) throw new Error(`wallet source ${provisioning.walletSource} violates ${environment.mode} campaign policy ${environment.provisioning.walletSource}`);
  if (provisioning.paymentTokenStrategy !== environment.provisioning.paymentTokenStrategy) throw new Error(`payment-token strategy ${provisioning.paymentTokenStrategy} violates ${environment.mode} campaign policy ${environment.provisioning.paymentTokenStrategy}`);
}

export function validateCampaignWallets(environment: CampaignEnvironment, wallets: readonly CampaignWalletBinding[], hardhatPrivateKeys: readonly Hex[]): void {
  const hardhatAddresses = new Set(hardhatPrivateKeys.map((key) => privateKeyToAccount(key).address.toLowerCase()));
  const slots = new Set<string>();
  const addresses = new Set<string>();
  for (const wallet of wallets) {
    if (slots.has(wallet.walletSlot)) throw new Error(`duplicate wallet slot ${wallet.walletSlot}`);
    if (addresses.has(wallet.address.toLowerCase())) throw new Error(`duplicate wallet address ${wallet.address}`);
    slots.add(wallet.walletSlot); addresses.add(wallet.address.toLowerCase());
    if (privateKeyToAccount(wallet.privateKey).address.toLowerCase() !== wallet.address.toLowerCase()) throw new Error(`private key does not match address for ${wallet.walletSlot}`);
    if (environment.mode === 'remote' && (wallet.source === 'hardhat' || hardhatAddresses.has(wallet.address.toLowerCase()))) throw new Error(`remote campaign refuses Hardhat wallet ${wallet.walletSlot}`);
  }
}

export async function preflightCampaignEnvironment(environment: CampaignEnvironment, chain: CampaignChainAdapter): Promise<CampaignPreflightResult> {
  const chainId = await chain.getChainId();
  if (chainId !== environment.expectedChainId) throw new Error(`wrong chain ID: expected ${environment.expectedChainId}, received ${chainId}`);
  const checkedContracts = Object.keys(environment.contracts) as CampaignContractName[];
  for (const name of checkedContracts) {
    const code = await chain.getBytecode(environment.contracts[name]);
    if (!code || code === '0x') throw new Error(`missing contract bytecode for ${name} at ${environment.contracts[name]}`);
  }
  return { mode: environment.mode, chainId, checkedContracts };
}
