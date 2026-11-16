import { strict as assert } from 'node:assert';
import { getAddress, type Address, type Hex } from 'viem';
import { HttpError } from './errors.js';
import { relayClaimTicket, type ClaimTicketRelayChain } from './claimTicketRelay.js';

const project = getAddress('0x1111111111111111111111111111111111111111');
const destination = getAddress('0x2222222222222222222222222222222222222222');
const transit = getAddress('0x3333333333333333333333333333333333333333');
const factory = getAddress('0x4444444444444444444444444444444444444444');
const request = {
  project,
  destination,
  transitAddress: transit,
  transitSignature: '0x11',
  destinationSignature: '0x22',
  deadline: '100',
};

function chain(overrides: Partial<ClaimTicketRelayChain> = {}): ClaimTicketRelayChain & { submitted?: Hex } {
  const result: ClaimTicketRelayChain & { submitted?: Hex } = {
    async readProvenance() { return { matchesFactory: true, redeemed: false }; },
    async simulateRedeem() {},
    async estimateRedeemGas() { return 100_000n; },
    async signerBalance() { return 1_000_000_000_000_000_000n; },
    async submitRedeem(_project: Address, data: Hex) {
      result.submitted = data;
      return '0xabc' as Hex;
    },
    ...overrides,
  };
  return result;
}

const config = { chainId: 31337, factoryAddress: factory, maxGas: 500_000n, minSignerBalance: 1n };

describe('claim ticket relay', () => {
  it('submits only the exact redeem call for a factory ticket', async () => {
    const fake = chain();
    const result = await relayClaimTicket(config, request, fake);
    assert.equal(result.transactionHash, '0xabc');
    assert.match(fake.submitted ?? '', /^0x/);
    assert.equal(result.payload.to, project);
  });

  it('refuses a project the configured factory did not record', async () => {
    await assert.rejects(
      () => relayClaimTicket(config, request, chain({
        async readProvenance() { return { matchesFactory: false, redeemed: false }; },
      })),
      (error: unknown) => error instanceof HttpError && error.code === 'unknown_claim_ticket',
    );
  });

  it('returns the same payload when sponsorship is exhausted', async () => {
    await assert.rejects(
      () => relayClaimTicket(config, request, chain({ async signerBalance() { return 0n; } })),
      (error: unknown) => error instanceof HttpError && error.code === 'sponsorship_exhausted' && (error.details as { to: string }).to === project,
    );
  });
});
