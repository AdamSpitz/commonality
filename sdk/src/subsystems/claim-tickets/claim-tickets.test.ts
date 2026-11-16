import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';
import { getAddress } from 'viem';
import { decodeClaimTicketCode, encodeClaimTicketCode } from './code.js';
import { foldClaimTickets, ticketProjectByTransit } from './folds.js';

const project = getAddress('0x1111111111111111111111111111111111111111');
const other = getAddress('0x2222222222222222222222222222222222222222');

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
