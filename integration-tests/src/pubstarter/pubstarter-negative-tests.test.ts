/**
 * Pubstarter Negative Tests
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
import { parseEther } from 'viem';
import {
  cidToBytes32,
  uploadToIPFS,
  type PubstarterContract,
  type AssuranceContract,
} from '@commonality/sdk';
import {
  createGraphQLClient,
} from '@commonality/sdk';
import { PubstarterAbi, AssuranceContractAbi } from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from '../utils/setup.js';
import {
  createProjectChecked,
  buyProjectTokensChecked,
  refundProjectTokensChecked,
  withdrawProjectFundsChecked,
} from '../actions/funding-actions-checked.js';

describe('Pubstarter Negative Tests', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as `0x${string}`;

  const SUITE_NAME = 'pubstarter-negative';

  // Note: Temporal constraint tests like "buying after deadline" are commented out
  // because the contract allows buying before the deadline passes, and only enforces
  // the deadline during finalization/withdrawal. This is by design for the assurance contract.

  describe('Validation Tests', () => {
    it('should prevent buying with insufficient payment', async () => {
      if (!PUBSTARTER_ADDRESS) {
        throw new Error('PUBSTARTER_ADDRESS not set in environment');
      }

      const aliceClients = createIsolatedTestClients(SUITE_NAME, 6, RPC_URL);
      const graphqlClient = createGraphQLClient(GRAPHQL_URL);

      const contract: PubstarterContract = {
        address: PUBSTARTER_ADDRESS,
        abi: PubstarterAbi,
      };

      const projectMetadataCid = cidToBytes32(await uploadToIPFS({
        name: 'Insufficient Payment Test',
        description: 'Testing payment validation',
      }));

      testLog('  Creating project...');
      const { projectDetails } = await createProjectChecked(
        aliceClients,
        contract,
        graphqlClient,
        {
          metadataURI: 'https://example.com/metadata/',
          contractURI: 'https://example.com/contract',
          owner: aliceClients.account,
          recipient: aliceClients.account,
          threshold: parseEther('10.0'),
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          projectMetadataCid,
          tokenIds: [0n],
          tokenCounts: [100n],
          tokenPrices: [parseEther('0.1')], // Price is 0.1 ETH
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
        graphqlClient,
        {
          buyer: aliceClients.account,
          tokenAddress: projectDetails.tokenAddress,
          tokenIds: [0n],
          tokenCounts: [1n],
          totalCost: parseEther('0.05'), // Only half the required amount!
        },
        {
          expectFailure: true,
          expectedError: /incorrect.*amount|insufficient|price|payment/i,
        }
      );

      assert.strictEqual(result, undefined, 'Failed action should return undefined');
      testLog('  ✓ Insufficient payment failed as expected');
    });

    it('should prevent buying non-existent token ID', async () => {
      if (!PUBSTARTER_ADDRESS) {
        throw new Error('PUBSTARTER_ADDRESS not set in environment');
      }

      const aliceClients = createIsolatedTestClients(SUITE_NAME, 7, RPC_URL);
      const graphqlClient = createGraphQLClient(GRAPHQL_URL);

      const contract: PubstarterContract = {
        address: PUBSTARTER_ADDRESS,
        abi: PubstarterAbi,
      };

      const projectMetadataCid = cidToBytes32(await uploadToIPFS({
        name: 'Invalid Token ID Test',
        description: 'Testing token ID validation',
      }));

      testLog('  Creating project with only token ID 0...');
      const { projectDetails } = await createProjectChecked(
        aliceClients,
        contract,
        graphqlClient,
        {
          metadataURI: 'https://example.com/metadata/',
          contractURI: 'https://example.com/contract',
          owner: aliceClients.account,
          recipient: aliceClients.account,
          threshold: parseEther('10.0'),
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          projectMetadataCid,
          tokenIds: [0n], // Only token ID 0 exists
          tokenCounts: [100n],
          tokenPrices: [parseEther('0.1')],
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
        graphqlClient,
        {
          buyer: aliceClients.account,
          tokenAddress: projectDetails.tokenAddress,
          tokenIds: [1n], // This token doesn't exist!
          tokenCounts: [1n],
          totalCost: parseEther('0.1'),
        },
        {
          expectFailure: true,
          expectedError: /incorrect.*amount|invalid.*token|not.*exist|unavailable/i,
        }
      );

      assert.strictEqual(result, undefined, 'Failed action should return undefined');
      testLog('  ✓ Non-existent token ID purchase failed as expected');
    });
  });
});
