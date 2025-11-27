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

  // Deploy ProjectAlignment contract
  const ProjectAlignment = await ethers.getContractFactory('ProjectAlignment');
  const projectAlignment = await ProjectAlignment.deploy();
  await projectAlignment.waitForDeployment();
  const projectAlignmentAddress = await projectAlignment.getAddress();
  console.log(`✓ ProjectAlignment: ${projectAlignmentAddress}`);

  // Deploy DelegatableNotes contract
  const DelegatableNotes = await ethers.getContractFactory('DelegatableNotes');
  const delegatableNotes = await DelegatableNotes.deploy();
  await delegatableNotes.waitForDeployment();
  const delegatableNotesAddress = await delegatableNotes.getAddress();
  console.log(`✓ DelegatableNotes: ${delegatableNotesAddress}`);

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

  // Update .env file
  const envPath = join(process.cwd(), '..', '.env');
  console.log(`\n=== Updating ${envPath} ===\n`);

  // Read existing .env
  let envContent = '';
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
  } catch (err) {
    console.log('No existing .env file, creating new one');
  }

  // Update or add contract addresses
  const updates = {
    'BELIEFS_CONTRACT_ADDRESS': beliefsAddress,
    'IMPLICATIONS_CONTRACT_ADDRESS': implicationsAddress,
    'PROJECT_ALIGNMENT_ADDRESS': projectAlignmentAddress,
    'DELEGATABLE_NOTES_ADDRESS': delegatableNotesAddress,
    'ASSURANCE_CONTRACT_FACTORY_ADDRESS': assuranceFactoryAddress,
    'ERC1155_FACTORY_ADDRESS': erc1155FactoryAddress,
    'MARKETPLACE_FACTORY_ADDRESS': marketplaceFactoryAddress,
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

  console.log('\n=== Deployment Complete ===\n');
  console.log('You can now start the indexer with: cd indexer && npm run dev');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
