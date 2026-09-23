import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
  configuredAddress,
  createSDKMachinery,
  requireConceptspaceContractAddress,
  requireFundingContractAddresses,
  requireSettlementTokenAddresses,
  requireTwitterApiConfig,
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

  it('rejects a zero address standing in for a missing contract', () => {
    assert.equal(configuredAddress('0x0000000000000000000000000000000000000000'), undefined);
    assert.throws(
      () => requireConceptspaceContractAddress({ beliefs: '0x0000000000000000000000000000000000000000' }, 'beliefs'),
      /Conceptspace contract address "beliefs" is required/,
    );
    assert.throws(
      () => requireFundingContractAddresses({
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x2000000000000000000000000000000000000002',
        delegatableNotes: '0x2000000000000000000000000000000000000003',
        noteIntent: '0x2000000000000000000000000000000000000004',
      }),
      /assuranceContractFactory/,
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

describe('social and settlement capabilities', () => {
  it('does not invent Twitter or settlement-token configuration', () => {
    const machinery = createSDKMachinery({ ipfsConfig: {} });
    assert.equal(machinery.twitterApiConfig, undefined);
    assert.equal(machinery.settlementTokenAddresses, undefined);
    assert.equal(createSDKMachinery({ settlementTokenAddresses: [] }).settlementTokenAddresses, undefined);
  });

  it('refuses social lookup until Twitter configuration is present', () => {
    assert.throws(
      () => requireTwitterApiConfig({}),
      /Twitter API configuration is required/,
    );
    assert.deepEqual(requireTwitterApiConfig({ twitterApiConfig: {} }), {});
  });

  it('refuses settlement-token actions until those addresses are configured', () => {
    assert.throws(
      () => requireSettlementTokenAddresses({}),
      /Settlement token addresses are required/,
    );
    assert.throws(
      () => requireSettlementTokenAddresses({
        settlementTokenAddresses: ['0x0000000000000000000000000000000000000000'],
      }),
      /Settlement token addresses are required/,
    );
    const tokens = requireSettlementTokenAddresses({
      settlementTokenAddresses: ['0x3000000000000000000000000000000000000001'],
    });
    assert.deepEqual(tokens, ['0x3000000000000000000000000000000000000001']);
  });
});
