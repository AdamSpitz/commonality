/**
 * Deployment Script
 *
 * Deploys contracts to any Hardhat network (localhost, testnet, mainnet)
 * Usage:
 *   Local: npx hardhat run scripts/deploy.js --network localhost
 *   Sepolia: npx hardhat run scripts/deploy.js --network sepolia
 *   Mainnet: npx hardhat run scripts/deploy.js --network mainnet
 */

import hre from 'hardhat';
import fs from 'fs/promises';
import { join } from 'path';

const { ethers } = hre;

async function main() {
  const network = hre.network.name;
  const isLocal = network === 'localhost';
  console.log(`\n=== Deploying Contracts to ${network} ===\n`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy Beliefs contract
  console.log('Deploying Beliefs...');
  const Beliefs = await ethers.getContractFactory('Beliefs');
  const beliefs = await Beliefs.deploy();
  await beliefs.waitForDeployment();
  const beliefsAddress = await beliefs.getAddress();
  console.log(`✓ Beliefs: ${beliefsAddress}`);

  // Deploy Implications contract
  console.log('Deploying Implications...');
  const Implications = await ethers.getContractFactory('Implications');
  const implications = await Implications.deploy();
  await implications.waitForDeployment();
  const implicationsAddress = await implications.getAddress();
  console.log(`✓ Implications: ${implicationsAddress}`);

  // Deploy AlignmentAttestations contract
  console.log('Deploying AlignmentAttestations...');
  const AlignmentAttestations = await ethers.getContractFactory('AlignmentAttestations');
  const alignmentAttestations = await AlignmentAttestations.deploy();
  await alignmentAttestations.waitForDeployment();
  const alignmentAttestationsAddress = await alignmentAttestations.getAddress();
  console.log(`✓ AlignmentAttestations: ${alignmentAttestationsAddress}`);

  // Deploy MutableRefUpdater contract
  console.log('Deploying MutableRefUpdater...');
  const MutableRefUpdater = await ethers.getContractFactory('MutableRefUpdater');
  const mutableRefUpdater = await MutableRefUpdater.deploy();
  await mutableRefUpdater.waitForDeployment();
  const mutableRefUpdaterAddress = await mutableRefUpdater.getAddress();
  console.log(`✓ MutableRefUpdater: ${mutableRefUpdaterAddress}`);

  // Deploy Pubstarter factory contracts
  console.log('\nDeploying Pubstarter factories...');

  const FreeERC1155Factory = await ethers.getContractFactory('FreeERC1155Factory');
  const freeERC1155Factory = await FreeERC1155Factory.deploy();
  await freeERC1155Factory.waitForDeployment();
  const freeERC1155FactoryAddress = await freeERC1155Factory.getAddress();
  console.log(`✓ FreeERC1155Factory: ${freeERC1155FactoryAddress}`);

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

  console.log('Deploying DelegatableNotes...');
  const DelegatableNotes = await ethers.getContractFactory('DelegatableNotes');
  const delegatableNotes = await DelegatableNotes.deploy(
    assuranceFactoryAddress,
    marketplaceFactoryAddress
  );
  await delegatableNotes.waitForDeployment();
  const delegatableNotesAddress = await delegatableNotes.getAddress();
  console.log(`✓ DelegatableNotes: ${delegatableNotesAddress}`);

  // Deploy Pubstarter main contract
  console.log('Deploying Pubstarter...');
  const Pubstarter = await ethers.getContractFactory('Pubstarter');
  const pubstarter = await Pubstarter.deploy(
    erc1155FactoryAddress,
    marketplaceFactoryAddress,
    assuranceFactoryAddress
  );
  await pubstarter.waitForDeployment();
  const pubstarterAddress = await pubstarter.getAddress();
  console.log(`✓ Pubstarter: ${pubstarterAddress}`);

  // Save timestamped deployment JSON record (non-localhost only; local node resets every restart)
  if (!isLocal) {
    const deploymentsDir = join(process.cwd(), 'deployments');
    await fs.mkdir(deploymentsDir, { recursive: true });

    const deploymentInfo = {
      network,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        Beliefs: beliefsAddress,
        Implications: implicationsAddress,
        AlignmentAttestations: alignmentAttestationsAddress,
        DelegatableNotes: delegatableNotesAddress,
        MutableRefUpdater: mutableRefUpdaterAddress,
        FreeERC1155Factory: freeERC1155FactoryAddress,
        AssuranceContractFactory: assuranceFactoryAddress,
        PremintingERC1155Factory: erc1155FactoryAddress,
        MarketplaceFactory: marketplaceFactoryAddress,
        Pubstarter: pubstarterAddress
      }
    };

    const deploymentFile = join(process.cwd(), 'deployments', `${network}-${Date.now()}.json`);
    await fs.writeFile(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n✓ Deployment JSON saved to: ${deploymentFile}`);
  }

  // Write deployments/<network>.env (committable contract addresses)
  const rootDir = join(process.cwd(), '..');
  const deploymentsDir = join(rootDir, 'deployments');
  await fs.mkdir(deploymentsDir, { recursive: true });

  const networkEnvPath = join(deploymentsDir, `${network}.env`);
  const addressEntries = {
    'BELIEFS_CONTRACT_ADDRESS': beliefsAddress,
    'IMPLICATIONS_CONTRACT_ADDRESS': implicationsAddress,
    'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS': alignmentAttestationsAddress,
    'ALIGNMENT_ATTESTATIONS_ADDRESS': alignmentAttestationsAddress,
    'DELEGATABLE_NOTES_CONTRACT_ADDRESS': delegatableNotesAddress,
    'DELEGATABLE_NOTES_ADDRESS': delegatableNotesAddress,
    'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS': mutableRefUpdaterAddress,
    'MUTABLE_REF_UPDATER_ADDRESS': mutableRefUpdaterAddress,
    'FREE_ERC1155_FACTORY_ADDRESS': freeERC1155FactoryAddress,
    'ASSURANCE_CONTRACT_FACTORY_ADDRESS': assuranceFactoryAddress,
    'ERC1155_FACTORY_ADDRESS': erc1155FactoryAddress,
    'MARKETPLACE_FACTORY_ADDRESS': marketplaceFactoryAddress,
    'PUBSTARTER_ADDRESS': pubstarterAddress,
    'START_BLOCK': '1',
  };

  let networkEnvContent = `# Contract addresses for ${network}\n`;
  networkEnvContent += `# Auto-populated by: npx hardhat run scripts/deploy.js --network ${network}\n`;
  networkEnvContent += `# Deployed: ${new Date().toISOString()}\n\n`;
  for (const [key, value] of Object.entries(addressEntries)) {
    networkEnvContent += `${key}=${value}\n`;
  }
  await fs.writeFile(networkEnvPath, networkEnvContent);
  console.log(`✓ Contract addresses saved to: ${networkEnvPath}`);
  if (!isLocal) {
    console.log('  (commit this file to share addresses with other services)');
  }

  // Propagate addresses to service .env files
  console.log(`\n=== Propagating to service .env files ===\n`);

  // Helper: update or append key=value in env content
  function updateEnv(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  }

  // Root .env
  const rootEnvPath = join(rootDir, '.env');
  let rootEnvContent = '';
  try {
    rootEnvContent = await fs.readFile(rootEnvPath, 'utf-8');
  } catch {
    console.log('  No existing .env file, creating new one');
  }
  for (const [key, value] of Object.entries(addressEntries)) {
    rootEnvContent = updateEnv(rootEnvContent, key, value);
  }
  if (isLocal) {
    rootEnvContent = updateEnv(rootEnvContent, 'IPFS_API', 'http://localhost:5001');
    rootEnvContent = updateEnv(rootEnvContent, 'IPFS_GATEWAY', 'http://localhost:8080/ipfs');
  }
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
  } catch {
    console.log('  No existing ui/.env, creating new one');
  }
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_BELIEFS_CONTRACT_ADDRESS', beliefsAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS', mutableRefUpdaterAddress);
  if (isLocal) {
    uiEnvContent = updateEnv(uiEnvContent, 'VITE_GRAPHQL_URL', 'http://localhost:42069/graphql');
  }
  await fs.writeFile(uiEnvPath, uiEnvContent);
  console.log('  ✓ Updated ui/.env');

  // attester/.env — just the contract address
  const attesterEnvPath = join(rootDir, 'attester', '.env');
  let attesterEnvContent = '';
  try {
    attesterEnvContent = await fs.readFile(attesterEnvPath, 'utf-8');
  } catch {
    console.log('  No existing attester/.env, creating new one');
  }
  attesterEnvContent = updateEnv(attesterEnvContent, 'IMPLICATIONS_CONTRACT_ADDRESS', implicationsAddress);
  await fs.writeFile(attesterEnvPath, attesterEnvContent);
  console.log('  ✓ Updated attester/.env');

  // Print summary
  console.log('\n=== Deployment Complete ===\n');
  console.log('Contract Addresses:');
  console.log(`  Beliefs:                 ${beliefsAddress}`);
  console.log(`  Implications:            ${implicationsAddress}`);
  console.log(`  AlignmentAttestations:   ${alignmentAttestationsAddress}`);
  console.log(`  DelegatableNotes:        ${delegatableNotesAddress}`);
  console.log(`  MutableRefUpdater:       ${mutableRefUpdaterAddress}`);
  console.log(`  FreeERC1155Factory:      ${freeERC1155FactoryAddress}`);
  console.log(`  AssuranceFactory:        ${assuranceFactoryAddress}`);
  console.log(`  ERC1155Factory:          ${erc1155FactoryAddress}`);
  console.log(`  MarketplaceFactory:      ${marketplaceFactoryAddress}`);
  console.log(`  Pubstarter:              ${pubstarterAddress}`);

  console.log('\nNext steps:');
  if (isLocal) {
    console.log('  - Start the indexer: cd indexer && npm run dev');
    console.log('  - Run integration tests: cd integration-tests && npm test');
  } else {
    console.log(`  - Commit deployments/${network}.env to share addresses`);
    console.log('  - Run: ./scripts/setup-env.sh ' + network);
    console.log('    (to regenerate all service .env files from secrets + addresses)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
