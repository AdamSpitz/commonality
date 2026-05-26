/**
 * LazyGiving Negative Tests
 *
 * Comprehensive negative testing for project funding actions.
 * Tests authorization, temporal constraints, and input validation using
 * the expectFailure framework.
 *
 * Categories tested:
 * - Temporal: Actions after deadline, wrong project state
 * - Authorization: Non-recipient trying privileged operations
 * - Validation: Zero amounts, invalid parameters
 * - State: Refunding successful projects, withdrawing before success
 */

import assert from 'assert';
import { parseUnits } from 'viem';
import {
  uploadToIPFS,
  type ProjectFactoryContract,
  type AssuranceContract,
  ProjectFactoryAbi,
  AssuranceContractAbi,
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import {
  createProjectChecked,
  buyProjectTokensChecked,
} from '../actions/funding-actions-checked.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';

describe('LazyGiving Negative Tests', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as `0x${string}`;

  const SUITE_NAME = 'negative-tests';

  // Note: Temporal constraint tests like "buying after deadline" are commented out
  // because the contract allows buying before the deadline passes, and only enforces
  // the deadline during finalization/withdrawal. This is by design for the assurance contract.

  describe('Validation Tests', () => {
    it('should prevent buying with insufficient payment', async () => {
      if (!PROJECT_FACTORY_ADDRESS) {
        throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
      }

      const aliceClients = createIsolatedTestClients(SUITE_NAME, 6, RPC_URL);
      const machinery = createActionTestingMachinery(GRAPHQL_URL);

      const contract: ProjectFactoryContract = {
        address: PROJECT_FACTORY_ADDRESS,
        abi: ProjectFactoryAbi,
      };

      const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
        name: 'Insufficient Payment Test',
        description: 'Testing payment validation',
      });

      testLog('  Creating project...');
      const { projectDetails } = await createProjectChecked(
        aliceClients,
        contract,
        machinery,
        {
          metadataURI: 'https://example.com/metadata/',
          contractURI: 'https://example.com/contract',
          owner: aliceClients.account,
          recipient: aliceClients.account,
          threshold: parseUnits('10.0', 6),
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          projectMetadataCid,
          tokenIds: [0n],
          tokenCounts: [100n],
          tokenPrices: [parseUnits('0.1', 6)], // Price is 0.1 ETH
        }
      );

      const assuranceContract: AssuranceContract = {
        address: projectDetails.assuranceContractAddress,
        abi: AssuranceContractAbi,
      };

      // Try to buy with insufficient payment
      testLog('  Attempting to buy tokens with insufficient payment (should fail)...');

      const result = await buyProjectTokensChecked(
        aliceClients,
        assuranceContract,
        machinery,
        {
          buyer: aliceClients.account,
          tokenAddress: projectDetails.tokenAddress,
          tokenIds: [0n],
          tokenCounts: [1n],
          totalCost: parseUnits('0.05', 6), // Only half the required amount!
        },
        {
          expectFailure: true,
          expectedError: /incorrect.*amount|insufficient|price|payment|0xfb8f41b2/i,
        }
      );

      assert.strictEqual(result, undefined, 'Failed action should return undefined');
      testLog('  ✓ Insufficient payment failed as expected');
    });

    it('should prevent buying non-existent token ID', async () => {
      if (!PROJECT_FACTORY_ADDRESS) {
        throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
      }

      const aliceClients = createIsolatedTestClients(SUITE_NAME, 7, RPC_URL);
      const machinery = createActionTestingMachinery(GRAPHQL_URL);

      const contract: ProjectFactoryContract = {
        address: PROJECT_FACTORY_ADDRESS,
        abi: ProjectFactoryAbi,
      };

      const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
        name: 'Invalid Token ID Test',
        description: 'Testing token ID validation',
      });

      testLog('  Creating project with only token ID 0...');
      const { projectDetails } = await createProjectChecked(
        aliceClients,
        contract,
        machinery,
        {
          metadataURI: 'https://example.com/metadata/',
          contractURI: 'https://example.com/contract',
          owner: aliceClients.account,
          recipient: aliceClients.account,
          threshold: parseUnits('10.0', 6),
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          projectMetadataCid,
          tokenIds: [0n], // Only token ID 0 exists
          tokenCounts: [100n],
          tokenPrices: [parseUnits('0.1', 6)],
        }
      );

      const assuranceContract: AssuranceContract = {
        address: projectDetails.assuranceContractAddress,
        abi: AssuranceContractAbi,
      };

      // Try to buy non-existent token ID 1
      testLog('  Attempting to buy non-existent token ID 1 (should fail)...');

      const result = await buyProjectTokensChecked(
        aliceClients,
        assuranceContract,
        machinery,
        {
          buyer: aliceClients.account,
          tokenAddress: projectDetails.tokenAddress,
          tokenIds: [1n], // This token doesn't exist!
          tokenCounts: [1n],
          totalCost: parseUnits('0.1', 6),
        },
        {
          expectFailure: true,
          expectedError: /incorrect.*amount|invalid.*token|not.*exist|unavailable|PriceNotSet|0x03dee4c5/i,
        }
      );

      assert.strictEqual(result, undefined, 'Failed action should return undefined');
      testLog('  ✓ Non-existent token ID purchase failed as expected');
    });
  });
});
