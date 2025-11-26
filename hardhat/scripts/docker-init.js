/**
 * Docker Initialization Script
 *
 * This script:
 * 1. Deploys all smart contracts to the local Hardhat node
 * 2. Runs the generative testing simulation to populate the blockchain with data
 * 3. Exports contract addresses to a file that the indexer can read
 */

import hre from 'hardhat';
import fs from 'fs/promises';
import { join } from 'path';
import { SimulationRunner } from '../generative-tests/runSimulation.js';

const { ethers } = hre;

async function main() {
  console.log('\n=== Docker Initialization Script ===\n');

  // Get configuration from environment
  const numUsers = parseInt(process.env.NUM_USERS || '30');
  const numRounds = parseInt(process.env.NUM_ROUNDS || '5');

  console.log(`Configuration:`);
  console.log(`  Users: ${numUsers}`);
  console.log(`  Simulation rounds: ${numRounds}`);
  console.log();

  // Create and run the simulation
  console.log('=== Creating Simulation Runner ===\n');
  const simulation = new SimulationRunner();

  // Initialize (deploys contracts, generates users/statements, funds accounts)
  await simulation.initialize(numUsers);

  // Run the simulation (executes random user actions)
  console.log('=== Running Simulation ===\n');
  await simulation.runSimulation(numRounds);

  // Save simulation results
  await simulation.saveResults();

  // Get deployed contract addresses
  const beliefs = await simulation.contracts.beliefs.getAddress();
  const implications = await simulation.contracts.implications.getAddress();
  const projectAlignment = await simulation.contracts.projectAlignment.getAddress();

  console.log('\n=== Deployed Contract Addresses ===\n');
  console.log(`Beliefs: ${beliefs}`);
  console.log(`Implications: ${implications}`);
  console.log(`ProjectAlignment: ${projectAlignment}`);

  // Export addresses to a file that can be read by the indexer
  const outputDir = '/app/deployment-output';
  const addressesFile = join(outputDir, 'addresses.env');
  const jsonFile = join(outputDir, 'addresses.json');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Write as environment variables (for shell sourcing)
  const envContent = [
    `BELIEFS_CONTRACT_ADDRESS=${beliefs}`,
    `IMPLICATIONS_CONTRACT_ADDRESS=${implications}`,
    `PROJECT_ALIGNMENT_ADDRESS=${projectAlignment}`,
    // Add placeholders for other contracts (not deployed in this simulation)
    `DELEGATABLE_NOTES_ADDRESS=`,
    `ASSURANCE_CONTRACT_FACTORY_ADDRESS=`,
    `ERC1155_FACTORY_ADDRESS=`,
    `MARKETPLACE_FACTORY_ADDRESS=`,
  ].join('\n');

  await fs.writeFile(addressesFile, envContent);
  console.log(`\n✓ Wrote addresses to ${addressesFile}`);

  // Also write as JSON (easier to parse in some contexts)
  const jsonContent = JSON.stringify({
    beliefs,
    implications,
    projectAlignment,
    // Placeholders
    delegatableNotes: null,
    assuranceContractFactory: null,
    erc1155Factory: null,
    marketplaceFactory: null,
  }, null, 2);

  await fs.writeFile(jsonFile, jsonContent);
  console.log(`✓ Wrote addresses to ${jsonFile}`);

  // Get final blockchain state
  const latestBlock = await ethers.provider.getBlockNumber();
  console.log(`\n=== Final State ===`);
  console.log(`Latest block: ${latestBlock}`);
  console.log(`Users generated: ${simulation.users.length}`);
  console.log(`Statements generated: ${simulation.statements.length}`);
  console.log(`Actions executed: ${simulation.actions.length}`);

  console.log('\n=== Initialization Complete ===\n');
  console.log('The indexer can now start syncing from block 0.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
