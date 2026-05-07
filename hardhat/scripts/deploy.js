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

const LOCAL_SEED_NUDGER_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

function getRepoRoot() {
  return process.env.COMMONALITY_ROOT_DIR || join(process.cwd(), '..');
}

/**
 * Parse a simple KEY=VALUE env file, ignoring comments and blank lines.
 */
function parseEnvFile(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return result;
}

function updateEnvString(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  return content + `\n${key}=${value}`;
}

async function updateEnvFile(filePath, entries) {
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    // Create below.
  }
  for (const [key, value] of Object.entries(entries)) {
    content = updateEnvString(content, key, value);
  }
  await fs.writeFile(filePath, content);
}

/**
 * Check if a contract address has deployed code on-chain.
 */
async function hasCode(address) {
  if (!address) return false;
  const code = await ethers.provider.getCode(address);
  return code !== '0x';
}

async function main() {
  const network = hre.network.name;
  const isLocal = network === 'localhost';
  console.log(`\n=== Deploying Contracts to ${network} ===\n`);

  // For localhost: check if contracts are already deployed and skip if so.
  // This makes restart idempotent when chain data is persisted.
  if (isLocal) {
    const rootDir = getRepoRoot();
    const networkEnvPath = join(rootDir, 'deployments', `${network}.env`);
    try {
      const content = await fs.readFile(networkEnvPath, 'utf-8');
      const existing = parseEnvFile(content);
      const addressKeys = [
        'BELIEFS_CONTRACT_ADDRESS',
        'IMPLICATIONS_CONTRACT_ADDRESS',
        'TRUST_REGISTRY_ADDRESS',
        'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
        'NOTE_INTENT_ADDRESS',
        'DELEGATABLE_NOTES_CONTRACT_ADDRESS',
        'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
        'FREE_ERC1155_FACTORY_ADDRESS',
        'ASSURANCE_CONTRACT_FACTORY_ADDRESS',
        'ERC1155_FACTORY_ADDRESS',
        'MARKETPLACE_FACTORY_ADDRESS',
        'ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS',
        'PAYMENT_TOKEN_ADDRESS',
        'PROJECT_FACTORY_ADDRESS',
        'CHANNEL_VERIFIER_ADDRESS',
        'CONTENT_REGISTRY_ADDRESS',
        'CHANNEL_REGISTRY_ADDRESS',
        'CHANNEL_ESCROW_ADDRESS',
        'CREATOR_CONTRACT_FACTORY_ADDRESS',
        'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
      ];
      const checks = await Promise.all(addressKeys.map(k => hasCode(existing[k])));
      if (checks.every(Boolean)) {
        await updateEnvFile(join(rootDir, 'ui', '.env'), {
          VITE_DEFAULT_NUDGERS: LOCAL_SEED_NUDGER_ADDRESS,
        });
        await updateEnvFile(join(rootDir, '.env'), {
          LOCAL_SEED_NUDGER_ADDRESS,
        });
        console.log('Contracts already deployed on-chain — skipping redeployment.');
        console.log(`(addresses from ${networkEnvPath})\n`);
        process.exit(0);
      }
      console.log('Some contracts missing from chain — redeploying all contracts.\n');
    } catch {
      // No existing deployment file; deploy fresh.
    }
  }

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

  console.log('Deploying TrustRegistry...');
  const TrustRegistry = await ethers.getContractFactory('TrustRegistry');
  const trustRegistry = await TrustRegistry.deploy();
  await trustRegistry.waitForDeployment();
  const trustRegistryAddress = await trustRegistry.getAddress();
  console.log(`✓ TrustRegistry: ${trustRegistryAddress}`);

  // Deploy AlignmentAttestations contract
  console.log('Deploying AlignmentAttestations...');
  const AlignmentAttestations = await ethers.getContractFactory('AlignmentAttestations');
  const alignmentAttestations = await AlignmentAttestations.deploy();
  await alignmentAttestations.waitForDeployment();
  const alignmentAttestationsAddress = await alignmentAttestations.getAddress();
  console.log(`✓ AlignmentAttestations: ${alignmentAttestationsAddress}`);

  // Deploy NoteIntent contract
  console.log('Deploying NoteIntent...');
  const NoteIntent = await ethers.getContractFactory('NoteIntent');
  const noteIntent = await NoteIntent.deploy();
  await noteIntent.waitForDeployment();
  const noteIntentAddress = await noteIntent.getAddress();
  console.log(`✓ NoteIntent: ${noteIntentAddress}`);

  // Deploy MutableRefUpdater contract
  console.log('Deploying MutableRefUpdater...');
  const MutableRefUpdater = await ethers.getContractFactory('MutableRefUpdater');
  const mutableRefUpdater = await MutableRefUpdater.deploy();
  await mutableRefUpdater.waitForDeployment();
  const mutableRefUpdaterAddress = await mutableRefUpdater.getAddress();
  console.log(`✓ MutableRefUpdater: ${mutableRefUpdaterAddress}`);

  // Deploy project support factory contracts
  console.log('\nDeploying project support factories...');

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

  const ValueThresholdConditionFactory = await ethers.getContractFactory('ValueThresholdConditionFactory');
  const conditionFactory = await ValueThresholdConditionFactory.deploy();
  await conditionFactory.waitForDeployment();
  const conditionFactoryAddress = await conditionFactory.getAddress();
  console.log(`✓ ValueThresholdConditionFactory: ${conditionFactoryAddress}`);

  console.log('Deploying payment token...');
  const FreeERC20 = await ethers.getContractFactory('FreeERC20');
  // Use 6 decimals to mimic USDC (a common real-world stablecoin).
  const paymentToken = await FreeERC20.deploy('Test USD', 'USDZZZ', 6);
  await paymentToken.waitForDeployment();
  const paymentTokenAddress = await paymentToken.getAddress();
  const signers = await ethers.getSigners();
  for (const signer of signers) {
    await paymentToken.mintTo(signer.address, ethers.parseUnits('1000000', 6));
  }
  console.log(`✓ PaymentToken (USDZZZ): ${paymentTokenAddress}`);

  console.log('\nDeploying Content Funding contracts...');

  // Deploy the real ChannelVerifier with the deployer as the trusted verifier.
  // The deployer's key is also used by the platform-api-service (VERIFIER_PRIVATE_KEY)
  // to sign channel-claim proofs. The owner can update the trusted verifier later
  // via setTrustedVerifier().
  const ChannelVerifier = await ethers.getContractFactory('ChannelVerifier');
  const channelVerifier = await ChannelVerifier.deploy(deployer.address);
  await channelVerifier.waitForDeployment();
  const channelVerifierAddress = await channelVerifier.getAddress();
  console.log(`✓ ChannelVerifier: ${channelVerifierAddress} (trustedVerifier: ${deployer.address})`);

  const ContentRegistry = await ethers.getContractFactory('ContentRegistry');
  const contentRegistry = await ContentRegistry.deploy();
  await contentRegistry.waitForDeployment();
  const contentRegistryAddress = await contentRegistry.getAddress();
  console.log(`✓ ContentRegistry: ${contentRegistryAddress}`);

  const ChannelRegistry = await ethers.getContractFactory('ChannelRegistry');
  const channelRegistry = await ChannelRegistry.deploy(channelVerifierAddress);
  await channelRegistry.waitForDeployment();
  const channelRegistryAddress = await channelRegistry.getAddress();
  console.log(`✓ ChannelRegistry: ${channelRegistryAddress}`);

  const ChannelEscrow = await ethers.getContractFactory('ChannelEscrow');
  const channelEscrow = await ChannelEscrow.deploy(channelRegistryAddress, paymentTokenAddress);
  await channelEscrow.waitForDeployment();
  const channelEscrowAddress = await channelEscrow.getAddress();
  console.log(`✓ ChannelEscrow: ${channelEscrowAddress}`);

  const CreatorAssuranceContractFactory = await ethers.getContractFactory('CreatorAssuranceContractFactory');
  const creatorContractFactory = await CreatorAssuranceContractFactory.deploy(
    contentRegistryAddress,
    channelRegistryAddress,
    channelEscrowAddress,
    erc1155FactoryAddress,
    marketplaceFactoryAddress,
    conditionFactoryAddress,
    paymentTokenAddress,
    ':'
  );
  await creatorContractFactory.waitForDeployment();
  const creatorContractFactoryAddress = await creatorContractFactory.getAddress();
  console.log(`✓ CreatorAssuranceContractFactory: ${creatorContractFactoryAddress}`);

  await (await contentRegistry.transferOwnership(creatorContractFactoryAddress)).wait();
  await (await channelRegistry.setFactory(creatorContractFactoryAddress)).wait();
  await (await delegatableNotes.setPrimaryMarketAuthorizer(creatorContractFactoryAddress, true)).wait();
  await (await creatorContractFactory.setDelegatableNotes(delegatableNotesAddress)).wait();
  console.log('✓ Content funding ownership wired (ContentRegistry owner + ChannelRegistry factory + delegated purchases)');

  // Deploy NudgePublications contract
  console.log('Deploying NudgePublications...');
  const NudgePublications = await ethers.getContractFactory('NudgePublications');
  const nudgePublications = await NudgePublications.deploy();
  await nudgePublications.waitForDeployment();
  const nudgePublicationsAddress = await nudgePublications.getAddress();
  console.log(`✓ NudgePublications: ${nudgePublicationsAddress}`);

  // Deploy main ProjectFactory contract
  console.log('Deploying ProjectFactory...');
  const ProjectFactory = await ethers.getContractFactory('ProjectFactory');
  const projectFactory = await ProjectFactory.deploy(
    erc1155FactoryAddress,
    marketplaceFactoryAddress,
    assuranceFactoryAddress,
    conditionFactoryAddress
  );
  await projectFactory.waitForDeployment();
  const projectFactoryAddress = await projectFactory.getAddress();
  console.log(`✓ ProjectFactory: ${projectFactoryAddress}`);

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
        TrustRegistry: trustRegistryAddress,
        AlignmentAttestations: alignmentAttestationsAddress,
        NoteIntent: noteIntentAddress,
        DelegatableNotes: delegatableNotesAddress,
        MutableRefUpdater: mutableRefUpdaterAddress,
        AssuranceContractFactory: assuranceFactoryAddress,
        PremintingERC1155Factory: erc1155FactoryAddress,
        MarketplaceFactory: marketplaceFactoryAddress,
        EthThresholdConditionFactory: conditionFactoryAddress,
        PaymentToken: paymentTokenAddress,
        NudgePublications: nudgePublicationsAddress,
        ProjectFactory: projectFactoryAddress,
        ChannelVerifier: channelVerifierAddress,
        ContentRegistry: contentRegistryAddress,
        ChannelRegistry: channelRegistryAddress,
        ChannelEscrow: channelEscrowAddress,
        CreatorAssuranceContractFactory: creatorContractFactoryAddress,
      }
    };

    const deploymentFile = join(process.cwd(), 'deployments', `${network}-${Date.now()}.json`);
    await fs.writeFile(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n✓ Deployment JSON saved to: ${deploymentFile}`);
  }

  // Write deployments/<network>.env (committable contract addresses)
  const rootDir = getRepoRoot();
  const deploymentsDir = join(rootDir, 'deployments');
  await fs.mkdir(deploymentsDir, { recursive: true });

  const networkEnvPath = join(deploymentsDir, `${network}.env`);
  const addressEntries = {
    'BELIEFS_CONTRACT_ADDRESS': beliefsAddress,
    'IMPLICATIONS_CONTRACT_ADDRESS': implicationsAddress,
    'TRUST_REGISTRY_ADDRESS': trustRegistryAddress,
    'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS': alignmentAttestationsAddress,
    'ALIGNMENT_ATTESTATIONS_ADDRESS': alignmentAttestationsAddress,
    'PROJECT_ALIGNMENT_CONTRACT_ADDRESS': alignmentAttestationsAddress,
    'NOTE_INTENT_ADDRESS': noteIntentAddress,
    'DELEGATABLE_NOTES_CONTRACT_ADDRESS': delegatableNotesAddress,
    'DELEGATABLE_NOTES_ADDRESS': delegatableNotesAddress,
    'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS': mutableRefUpdaterAddress,
    'MUTABLE_REF_UPDATER_ADDRESS': mutableRefUpdaterAddress,
    'ASSURANCE_CONTRACT_FACTORY_ADDRESS': assuranceFactoryAddress,
    'ERC1155_FACTORY_ADDRESS': erc1155FactoryAddress,
    'MARKETPLACE_FACTORY_ADDRESS': marketplaceFactoryAddress,
    'ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS': conditionFactoryAddress,
    'PAYMENT_TOKEN_ADDRESS': paymentTokenAddress,
    'PROJECT_FACTORY_ADDRESS': projectFactoryAddress,
    'CHANNEL_VERIFIER_ADDRESS': channelVerifierAddress,
    'CONTENT_REGISTRY_ADDRESS': contentRegistryAddress,
    'CHANNEL_REGISTRY_ADDRESS': channelRegistryAddress,
    'CHANNEL_ESCROW_ADDRESS': channelEscrowAddress,
    'CREATOR_CONTRACT_FACTORY_ADDRESS': creatorContractFactoryAddress,
    'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS': nudgePublicationsAddress,
    'CONTENT_FUNDING_START_BLOCK': '1',
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
    rootEnvContent = updateEnv(rootEnvContent, 'EVENT_CACHE_URL', 'http://localhost:42069');
    // Hardhat account #0 private key — matches the deployer/trustedVerifier for local dev.
    rootEnvContent = updateEnv(rootEnvContent, 'VERIFIER_PRIVATE_KEY', '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
    rootEnvContent = updateEnv(rootEnvContent, 'LOCAL_SEED_NUDGER_ADDRESS', LOCAL_SEED_NUDGER_ADDRESS);
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
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_IMPLICATIONS_CONTRACT_ADDRESS', implicationsAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS', mutableRefUpdaterAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS', delegatableNotesAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_NOTE_INTENT_CONTRACT_ADDRESS', noteIntentAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS', assuranceFactoryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_ERC1155_FACTORY_ADDRESS', erc1155FactoryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_MARKETPLACE_FACTORY_ADDRESS', marketplaceFactoryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS', alignmentAttestationsAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS', trustRegistryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS', nudgePublicationsAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_CONTENT_REGISTRY_ADDRESS', contentRegistryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_CHANNEL_REGISTRY_ADDRESS', channelRegistryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_CHANNEL_VERIFIER_ADDRESS', channelVerifierAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_CHANNEL_ESCROW_ADDRESS', channelEscrowAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS', creatorContractFactoryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS', projectFactoryAddress);
  uiEnvContent = updateEnv(uiEnvContent, 'VITE_PAYMENT_TOKEN_ADDRESS', paymentTokenAddress);
  if (isLocal) {
    uiEnvContent = updateEnv(uiEnvContent, 'VITE_GRAPHQL_URL', 'http://localhost:42069/graphql');
    uiEnvContent = updateEnv(uiEnvContent, 'VITE_IPFS_GATEWAY', 'http://localhost:8080/ipfs');
    uiEnvContent = updateEnv(uiEnvContent, 'VITE_DEFAULT_NUDGERS', LOCAL_SEED_NUDGER_ADDRESS);
  }
  await fs.writeFile(uiEnvPath, uiEnvContent);
  console.log('  ✓ Updated ui/.env');

  // implication-attester/.env — just the contract address
  const attesterEnvPath = join(rootDir, 'implication-attester', '.env');
  let attesterEnvContent = '';
  try {
    attesterEnvContent = await fs.readFile(attesterEnvPath, 'utf-8');
  } catch {
    console.log('  No existing implication-attester/.env, creating new one');
  }
  attesterEnvContent = updateEnv(attesterEnvContent, 'IMPLICATIONS_CONTRACT_ADDRESS', implicationsAddress);
  await fs.writeFile(attesterEnvPath, attesterEnvContent);
  console.log('  ✓ Updated implication-attester/.env');

  // Print summary
  console.log('\n=== Deployment Complete ===\n');
  console.log('Contract Addresses:');
  console.log(`  Beliefs:                 ${beliefsAddress}`);
  console.log(`  Implications:            ${implicationsAddress}`);
  console.log(`  TrustRegistry:           ${trustRegistryAddress}`);
  console.log(`  AlignmentAttestations:   ${alignmentAttestationsAddress}`);
  console.log(`  NoteIntent:              ${noteIntentAddress}`);
  console.log(`  DelegatableNotes:        ${delegatableNotesAddress}`);
  console.log(`  MutableRefUpdater:       ${mutableRefUpdaterAddress}`);
  console.log(`  AssuranceFactory:        ${assuranceFactoryAddress}`);
  console.log(`  ERC1155Factory:          ${erc1155FactoryAddress}`);
  console.log(`  MarketplaceFactory:      ${marketplaceFactoryAddress}`);
  console.log(`  ConditionFactory:        ${conditionFactoryAddress}`);
  console.log(`  PaymentToken:            ${paymentTokenAddress}`);
  console.log(`  ProjectFactory:          ${projectFactoryAddress}`);
  console.log(`  ChannelVerifier:         ${channelVerifierAddress}`);
  console.log(`  ContentRegistry:         ${contentRegistryAddress}`);
  console.log(`  ChannelRegistry:         ${channelRegistryAddress}`);
  console.log(`  ChannelEscrow:           ${channelEscrowAddress}`);
  console.log(`  CreatorContractFactory:  ${creatorContractFactoryAddress}`);
  console.log(`  NudgePublications:       ${nudgePublicationsAddress}`);

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
