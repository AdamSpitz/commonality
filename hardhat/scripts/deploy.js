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

  // Deploy DelegatableNotes contract
  console.log('Deploying DelegatableNotes...');
  const DelegatableNotes = await ethers.getContractFactory('DelegatableNotes');
  const delegatableNotes = await DelegatableNotes.deploy();
  await delegatableNotes.waitForDeployment();
  const delegatableNotesAddress = await delegatableNotes.getAddress();
  console.log(`✓ DelegatableNotes: ${delegatableNotesAddress}`);

  // Deploy MutableRefUpdater contract
  console.log('Deploying MutableRefUpdater...');
  const MutableRefUpdater = await ethers.getContractFactory('MutableRefUpdater');
  const mutableRefUpdater = await MutableRefUpdater.deploy();
  await mutableRefUpdater.waitForDeployment();
  const mutableRefUpdaterAddress = await mutableRefUpdater.getAddress();
  console.log(`✓ MutableRefUpdater: ${mutableRefUpdaterAddress}`);

  // Deploy Pubstarter factory contracts
  console.log('\nDeploying Pubstarter factories...');
  
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

  // Save deployment info
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
      AssuranceContractFactory: assuranceFactoryAddress,
      PremintingERC1155Factory: erc1155FactoryAddress,
      MarketplaceFactory: marketplaceFactoryAddress,
      Pubstarter: pubstarterAddress
    }
  };

  // Save to deployments directory
  const deploymentsDir = join(process.cwd(), 'deployments');
  await fs.mkdir(deploymentsDir, { recursive: true });
  
  const deploymentFile = join(deploymentsDir, `${network}-${Date.now()}.json`);
  await fs.writeFile(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✓ Deployment info saved to: ${deploymentFile}`);

  // For localhost, also update .env file
  if (network === 'localhost') {
    const envPath = join(process.cwd(), '..', '.env');
    console.log(`\n=== Updating ${envPath} ===\n`);

    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (err) {
      console.log('No existing .env file, creating new one');
    }

    const updates = {
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
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    await fs.writeFile(envPath, envContent);
    console.log('✓ Updated .env file with contract addresses');

    // Also write .env file for integration tests
    const testEnvPath = join(process.cwd(), '..', 'integration-tests', '.env.local');
    await fs.writeFile(testEnvPath, envContent);
    console.log('✓ Updated integration-tests/.env.local');
  }

  // Print summary
  console.log('\n=== Deployment Complete ===\n');
  console.log('Contract Addresses:');
  console.log(`  Beliefs:                 ${beliefsAddress}`);
  console.log(`  Implications:            ${implicationsAddress}`);
  console.log(`  AlignmentAttestations:   ${alignmentAttestationsAddress}`);
  console.log(`  DelegatableNotes:        ${delegatableNotesAddress}`);
  console.log(`  MutableRefUpdater:       ${mutableRefUpdaterAddress}`);
  console.log(`  AssuranceFactory:        ${assuranceFactoryAddress}`);
  console.log(`  ERC1155Factory:          ${erc1155FactoryAddress}`);
  console.log(`  MarketplaceFactory:      ${marketplaceFactoryAddress}`);
  console.log(`  Pubstarter:              ${pubstarterAddress}`);
  
  if (network === 'localhost') {
    console.log('\nYou can now:');
    console.log('  - Start the indexer: cd indexer && npm run dev');
    console.log('  - Run integration tests: cd integration-tests && npm test');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
