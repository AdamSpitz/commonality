/**
 * Local Deployment Script
 *
 * Deploys contracts to local Hardhat node and updates .env file
 * Usage: npx hardhat run scripts/deploy-local.js --network localhost
 */

import hre from 'hardhat';
import fs from 'fs/promises';
import { join } from 'path';

const { ethers } = hre;

async function main() {
  console.log('\n=== Deploying Contracts to Local Hardhat ===\n');

  // Deploy Beliefs contract
  const Beliefs = await ethers.getContractFactory('Beliefs');
  const beliefs = await Beliefs.deploy();
  await beliefs.waitForDeployment();
  const beliefsAddress = await beliefs.getAddress();
  console.log(`✓ Beliefs: ${beliefsAddress}`);

  // Deploy Implications contract
  const Implications = await ethers.getContractFactory('Implications');
  const implications = await Implications.deploy();
  await implications.waitForDeployment();
  const implicationsAddress = await implications.getAddress();
  console.log(`✓ Implications: ${implicationsAddress}`);

  // Deploy AlignmentAttestations contract
  const AlignmentAttestations = await ethers.getContractFactory('AlignmentAttestations');
  const alignmentAttestations = await AlignmentAttestations.deploy();
  await alignmentAttestations.waitForDeployment();
  const alignmentAttestationsAddress = await alignmentAttestations.getAddress();
  console.log(`✓ AlignmentAttestations: ${alignmentAttestationsAddress}`);

  // Deploy MutableRefUpdater contract
  const MutableRefUpdater = await ethers.getContractFactory('MutableRefUpdater');
  const mutableRefUpdater = await MutableRefUpdater.deploy();
  await mutableRefUpdater.waitForDeployment();
  const mutableRefUpdaterAddress = await mutableRefUpdater.getAddress();
  console.log(`✓ MutableRefUpdater: ${mutableRefUpdaterAddress}`);

  // Deploy Pubstarter factory contracts
  const AssuranceContractFactory = await ethers.getContractFactory('AssuranceContractFactory');
  const assuranceFactory = await AssuranceContractFactory.deploy();
  await assuranceFactory.waitForDeployment();
  const assuranceFactoryAddress = await assuranceFactory.getAddress();
  console.log(`✓ AssuranceContractFactory: ${assuranceFactoryAddress}`);

  const PremintingERC1155Factory = await ethers.getContractFactory('PremintingERC1155Factory');
  const erc1155Factory = await PremintingERC1155Factory.deploy();
  await erc1155Factory.waitForDeployment();
  const erc1155FactoryAddress = await erc1155Factory.getAddress();
  console.log(`✓ PremintingERC1155Factory: ${erc1155FactoryAddress}`);

  const MarketplaceFactory = await ethers.getContractFactory('MarketplaceFactory');
  const marketplaceFactory = await MarketplaceFactory.deploy();
  await marketplaceFactory.waitForDeployment();
  const marketplaceFactoryAddress = await marketplaceFactory.getAddress();
  console.log(`✓ MarketplaceFactory: ${marketplaceFactoryAddress}`);

  const DelegatableNotes = await ethers.getContractFactory('DelegatableNotes');
  const delegatableNotes = await DelegatableNotes.deploy(
    assuranceFactoryAddress,
    marketplaceFactoryAddress
  );
  await delegatableNotes.waitForDeployment();
  const delegatableNotesAddress = await delegatableNotes.getAddress();
  console.log(`✓ DelegatableNotes: ${delegatableNotesAddress}`);

  // Deploy Pubstarter main contract (combines the three factories)
  const Pubstarter = await ethers.getContractFactory('Pubstarter');
  const pubstarter = await Pubstarter.deploy(
    erc1155FactoryAddress,
    marketplaceFactoryAddress,
    assuranceFactoryAddress
  );
  await pubstarter.waitForDeployment();
  const pubstarterAddress = await pubstarter.getAddress();
  console.log(`✓ Pubstarter: ${pubstarterAddress}`);

  // Write deployments/localhost.env (committable contract addresses)
  const rootDir = join(process.cwd(), '..');
  const deploymentsDir = join(rootDir, 'deployments');
  await fs.mkdir(deploymentsDir, { recursive: true });

  const addressEntries = {
    'BELIEFS_CONTRACT_ADDRESS': beliefsAddress,
    'IMPLICATIONS_CONTRACT_ADDRESS': implicationsAddress,
    'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS': alignmentAttestationsAddress,
    'ALIGNMENT_ATTESTATIONS_ADDRESS': alignmentAttestationsAddress,
    'DELEGATABLE_NOTES_CONTRACT_ADDRESS': delegatableNotesAddress,
    'DELEGATABLE_NOTES_ADDRESS': delegatableNotesAddress,
    'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS': mutableRefUpdaterAddress,
    'MUTABLE_REF_UPDATER_ADDRESS': mutableRefUpdaterAddress,
    'ASSURANCE_CONTRACT_FACTORY_ADDRESS': assuranceFactoryAddress,
    'ERC1155_FACTORY_ADDRESS': erc1155FactoryAddress,
    'MARKETPLACE_FACTORY_ADDRESS': marketplaceFactoryAddress,
    'PUBSTARTER_ADDRESS': pubstarterAddress,
    'START_BLOCK': '1',
  };

  let networkEnvContent = `# Contract addresses for localhost (Hardhat node)\n`;
  networkEnvContent += `# Auto-populated by: npx hardhat run scripts/deploy-local.js --network localhost\n`;
  networkEnvContent += `# Deployed: ${new Date().toISOString()}\n\n`;
  for (const [key, value] of Object.entries(addressEntries)) {
    networkEnvContent += `${key}=${value}\n`;
  }
  await fs.writeFile(join(deploymentsDir, 'localhost.env'), networkEnvContent);
  console.log('✓ Updated deployments/localhost.env');

  // Helper: update or append key=value in env content
  function updateEnv(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  }

  // Propagate to service .env files
  console.log(`\n=== Propagating to service .env files ===\n`);

  // Root .env
  const rootEnvPath = join(rootDir, '.env');
  let rootEnvContent = '';
  try {
    rootEnvContent = await fs.readFile(rootEnvPath, 'utf-8');
  } catch (err) {
    console.log('  No existing .env file, creating new one');
  }
  for (const [key, value] of Object.entries(addressEntries)) {
    rootEnvContent = updateEnv(rootEnvContent, key, value);
  }
  rootEnvContent = updateEnv(rootEnvContent, 'IPFS_API', 'http://localhost:5001');
  rootEnvContent = updateEnv(rootEnvContent, 'IPFS_GATEWAY', 'http://localhost:8080/ipfs');
  await fs.writeFile(rootEnvPath, rootEnvContent);
  console.log('  ✓ Updated .env');

  // integration-tests/.env.local
  const testEnvPath = join(rootDir, 'integration-tests', '.env.local');
  await fs.writeFile(testEnvPath, rootEnvContent);
  console.log('  ✓ Updated integration-tests/.env.local');

  // ui/.env — needs VITE_ prefix
  const uiEnvPath = join(rootDir, 'ui', '.env');
  let uiEnvContent = '';
  try {
    uiEnvContent = await fs.readFile(uiEnvPath, 'utf-8');
  } catch (err) {
    console.log('  No existing ui/.env, creating new one');
  }
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_BELIEFS_CONTRACT_ADDRESS', beliefsAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS', mutableRefUpdaterAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_GRAPHQL_URL', 'http://localhost:42069/graphql');
  await fs.writeFile(uiEnvPath, uiEnvContent);
  console.log('  ✓ Updated ui/.env');

  // attester/.env — just the contract address
  const attesterEnvPath = join(rootDir, 'attester', '.env');
  let attesterEnvContent = '';
  try {
    attesterEnvContent = await fs.readFile(attesterEnvPath, 'utf-8');
  } catch (err) {
    console.log('  No existing attester/.env, creating new one');
  }
  attesterEnvContent = updateEnv(attesterEnvContent, 'IMPLICATIONS_CONTRACT_ADDRESS', implicationsAddress);
  await fs.writeFile(attesterEnvPath, attesterEnvContent);
  console.log('  ✓ Updated attester/.env');

  console.log('\n=== Deployment Complete ===\n');
  console.log('You can now start the indexer with: cd indexer && npm run dev');
  console.log('Or run integration tests with: cd integration-tests && npm test');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
