import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';
import { getAddress } from 'viem';
import { decodeClaimTicketCode, encodeClaimTicketCode } from './code.js';
import { foldClaimTickets, ticketProjectByTransit } from './folds.js';
import { ClaimTicketCreationRevertedError, createClaimTicketProject } from './actions.js';
import type { WriteClients } from '../../utils/ethereum.js';

const project = getAddress('0x1111111111111111111111111111111111111111');
const other = getAddress('0x2222222222222222222222222222222222222222');

describe('claim ticket creation recovery', () => {
  it('exposes the submitted hash before timeout and resumes it without another write', async () => {
    const hash = `0x${'12'.repeat(32)}` as const;
    let writes = 0;
    let submitted: typeof hash | undefined;
    let reverted = false;
    const clients = {
      walletClient: {
        chain: { id: 31337 },
        account: { address: project },
        writeContract: async () => { writes++; return hash; },
      },
      publicClient: {
        waitForTransactionReceipt: async ({ hash: requested }: { hash: string }) => {
          assert.equal(requested, hash);
          assert.equal(submitted, hash);
          if (reverted) return { status: 'reverted' };
          throw new Error('Confirmation timed out');
        },
      },
    } as unknown as WriteClients;
    const transitKey = generatePrivateKey();
    const params = {
      metadataURI: '', contractURI: '', owner: project,
      transitAddress: privateKeyToAddress(transitKey), transitKey,
      paymentToken: other, threshold: 1n, deadline: 100n,
      projectMetadataCid: '' as Parameters<typeof createClaimTicketProject>[2]['projectMetadataCid'],
      tokenIds: [1n], tokenCounts: [1n], tokenPrices: [1n],
    };
    await assert.rejects(createClaimTicketProject(clients, project, params, {
      onSubmitted: (value) => { submitted = value as typeof hash; },
    }), /Confirmation timed out/);
    await assert.rejects(createClaimTicketProject(clients, project, params, {
      transactionHash: submitted,
    }), /Confirmation timed out/);
    assert.equal(writes, 1);
    reverted = true;
    await assert.rejects(createClaimTicketProject(clients, project, params, {
      transactionHash: submitted,
    }), (error) => error instanceof ClaimTicketCreationRevertedError && error.transactionHash === hash);
    assert.equal(writes, 1);
  });
});

describe('claim ticket codes', () => {
  it('round-trips a versioned code and rejects a changed character', () => {
    const transitKey = generatePrivateKey();
    const code = encodeClaimTicketCode({ chainId: 31337n, project, transitKey });
    const decoded = decodeClaimTicketCode(code);
    assert.equal(decoded.chainId, 31337n);
    assert.equal(decoded.project, project);
    assert.equal(decoded.transitKey, transitKey);
    assert.equal(privateKeyToAddress(decoded.transitKey), privateKeyToAddress(transitKey));
    assert.throws(() => decodeClaimTicketCode(`${code.slice(0, -1)}${code.endsWith('A') ? 'B' : 'A'}`));
    assert.throws(() => decodeClaimTicketCode(code.replace('ct1:', 'seed ')));
  });
});

describe('claim ticket folds', () => {
  it('binds a destination without inventing a second project for one transit address', () => {
    const transit = getAddress('0x3333333333333333333333333333333333333333');
    const destination = getAddress('0x4444444444444444444444444444444444444444');
    const folded = foldClaimTickets(
      [{ project, transitAddress: transit }],
      [{ project, destination, deadline: 90n }],
    );
    assert.equal(folded.get(project)?.redeemed, true);
    assert.equal(folded.get(project)?.destination, destination);
    assert.equal(ticketProjectByTransit(folded, transit)?.project, project);
    assert.throws(() => foldClaimTickets([
      { project, transitAddress: transit },
      { project: other, transitAddress: transit },
    ]));
  });
});
