import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ClaimTicketAssuranceContractAbi, ProjectFactoryAbi } from '@commonality/sdk/abis/funding';
import type { PlatformApiServiceConfig } from './config.js';
import { HttpError } from './errors.js';
import type { ClaimTicketRelayChain } from './claimTicketRelay.js';

export function createClaimTicketRelayChain(config: PlatformApiServiceConfig): ClaimTicketRelayChain {
  if (!config.claimTicketRpcUrl || !config.claimTicketChainId || !config.claimTicketFactoryAddress || !config.claimTicketRelayPrivateKey) {
    throw new HttpError(503, 'claim_relay_not_configured', 'Claim ticket relay is not configured for this deployment.');
  }
  const account = privateKeyToAccount(config.claimTicketRelayPrivateKey);
  const chain = { id: config.claimTicketChainId, name: 'claim-ticket', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [config.claimTicketRpcUrl] } } } as const;
  const transport = http(config.claimTicketRpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });
  const factory = config.claimTicketFactoryAddress;
  return {
    async readProvenance(project, transitAddress) {
      const [recorded, onProject, redeemed] = await Promise.all([
        publicClient.readContract({ address: factory, abi: ProjectFactoryAbi, functionName: 'ticketProjectOf', args: [transitAddress] }),
        publicClient.readContract({ address: project, abi: ClaimTicketAssuranceContractAbi, functionName: 'transitAddress' }),
        publicClient.readContract({ address: project, abi: ClaimTicketAssuranceContractAbi, functionName: 'redeemed' }),
      ]);
      return {
        matchesFactory: getSame(recorded, project) && getSame(onProject, transitAddress),
        redeemed: Boolean(redeemed),
      };
    },
    async simulateRedeem(project, data) {
      await publicClient.call({ to: project, data, account: account.address });
    },
    async estimateRedeemGas(project, data) {
      return publicClient.estimateGas({ to: project, data, account: account.address });
    },
    async signerBalance() {
      return publicClient.getBalance({ address: account.address });
    },
    async submitRedeem(project, data) {
      return walletClient.sendTransaction({ to: project, data, account, chain });
    },
  };
}

function getSame(left: Address, right: Address): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export type { Hex };
