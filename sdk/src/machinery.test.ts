import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
  requireFundingContractAddresses,
  type ConceptspaceContractAddresses,
  type DeployedContractAddresses,
} from './machinery.js';

const conceptspaceOnly: ConceptspaceContractAddresses = {
  beliefs: '0x1000000000000000000000000000000000000001',
  implications: '0x1000000000000000000000000000000000000002',
  alignmentAttestations: '0x1000000000000000000000000000000000000003',
  mutableRefUpdater: '0x1000000000000000000000000000000000000004',
  trustRegistry: '0x1000000000000000000000000000000000000005',
};

describe('contract address capabilities', () => {
  it('accepts a Conceptspace configuration with no funding addresses', () => {
    const deployed: DeployedContractAddresses = conceptspaceOnly;
    assert.equal(deployed.assuranceContractFactory, undefined);
    assert.equal(deployed.beliefs, conceptspaceOnly.beliefs);
  });

  it('refuses funding actions until the funding addresses are configured', () => {
    assert.throws(
      () => requireFundingContractAddresses(conceptspaceOnly),
      /Funding contract addresses are required/,
    );
  });

  it('returns the funding addresses when all four core fields are set', () => {
    const funding = requireFundingContractAddresses({
      ...conceptspaceOnly,
      assuranceContractFactory: '0x2000000000000000000000000000000000000001',
      erc1155Factory: '0x2000000000000000000000000000000000000002',
      delegatableNotes: '0x2000000000000000000000000000000000000003',
      noteIntent: '0x2000000000000000000000000000000000000004',
    });
    assert.equal(funding.noteIntent, '0x2000000000000000000000000000000000000004');
  });
});
