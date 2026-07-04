import hre from 'hardhat';
import fs from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const { ethers } = hre;
const LOCAL_SEED_NUDGER_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

const ADDRESS_KEYS = {
  Beliefs: ['BELIEFS_CONTRACT_ADDRESS'],
  Implications: ['IMPLICATIONS_CONTRACT_ADDRESS'],
  TrustRegistry: ['TRUST_REGISTRY_ADDRESS'],
  AccountAssertions: ['ACCOUNT_ASSERTIONS_ADDRESS'],
  AlignmentAttestations: ['ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS', 'ALIGNMENT_ATTESTATIONS_ADDRESS', 'PROJECT_ALIGNMENT_CONTRACT_ADDRESS'],
  NoteIntent: ['NOTE_INTENT_ADDRESS'],
  MutableRefUpdater: ['MUTABLE_REF_UPDATER_CONTRACT_ADDRESS', 'MUTABLE_REF_UPDATER_ADDRESS'],
  AssuranceContractFactory: ['ASSURANCE_CONTRACT_FACTORY_ADDRESS'],
  PremintingERC1155Factory: ['ERC1155_FACTORY_ADDRESS'],
  MarketplaceFactory: ['MARKETPLACE_FACTORY_ADDRESS'],
  DelegatableNotes: ['DELEGATABLE_NOTES_CONTRACT_ADDRESS', 'DELEGATABLE_NOTES_ADDRESS'],
  RecurringPledges: ['RECURRING_PLEDGES_CONTRACT_ADDRESS', 'RECURRING_PLEDGES_ADDRESS'],
  ValueThresholdConditionFactory: ['ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS'],
  FreeERC20: ['PAYMENT_TOKEN_ADDRESS'],
  ChannelVerifier: ['CHANNEL_VERIFIER_ADDRESS'],
  ContentRegistry: ['CONTENT_REGISTRY_ADDRESS'],
  ChannelRegistry: ['CHANNEL_REGISTRY_ADDRESS'],
  ChannelEscrow: ['CHANNEL_ESCROW_ADDRESS'],
  CreatorAssuranceContractFactory: ['CREATOR_CONTRACT_FACTORY_ADDRESS'],
  NudgePublications: ['NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'],
  ProjectFactory: ['PROJECT_FACTORY_ADDRESS'],
  SponsoredGasEntryPoint: ['SPONSORED_GAS_ENTRY_POINT_ADDRESS'],
  CreatorGasTank: ['CREATOR_GAS_TANK_ADDRESS'],
};

function repoRoot() { return process.env.COMMONALITY_ROOT_DIR || join(process.cwd(), '..'); }
function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i !== -1) out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
}
async function readEnv(path) {
  try { return parseEnv(await fs.readFile(path, 'utf8')); } catch {
    // Missing env files are expected on first deployment.
    return {};
  }
}
function updateEnvString(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  return regex.test(content) ? content.replace(regex, `${key}=${value}`) : `${content}${content.endsWith('\n') || !content ? '' : '\n'}${key}=${value}\n`;
}
async function updateEnvFile(path, entries) {
  let content = '';
  try { content = await fs.readFile(path, 'utf8'); } catch {
    // Create the file below when it does not exist yet.
  }
  for (const [k, v] of Object.entries(entries)) content = updateEnvString(content, k, v);
  await fs.writeFile(path, content);
}
async function hasCode(address) { return address && ethers.isAddress(address) && (await ethers.provider.getCode(address)) !== '0x'; }
function requireAddress(key, value) {
  if (!value?.trim()) throw new Error(`${key} is required for non-local deployments`);
  if (!ethers.isAddress(value)) throw new Error(`${key} must be a valid Ethereum address; got ${value}`);
  return ethers.getAddress(value);
}
function envBigInt(env, key, fallback) {
  const value = env[key] ?? process.env[key];
  return value?.trim() ? BigInt(value).toString() : fallback.toString();
}
function envNumber(env, key, fallback) {
  const value = env[key] ?? process.env[key];
  return value?.trim() ? Number(value) : fallback;
}
async function fingerprint(contractName, args, extra = []) {
  const factory = await ethers.getContractFactory(contractName);
  const artifact = await hre.artifacts.readArtifact(contractName);
  return crypto.createHash('sha256').update(JSON.stringify({
    contractName,
    sourceName: artifact.sourceName,
    bytecode: factory.bytecode,
    deployedBytecode: artifact.deployedBytecode,
    abi: artifact.abi,
    args,
    extra,
  })).digest('hex');
}

async function main() {
  const network = hre.network.name;
  const isLocal = network === 'localhost' || network === 'hardhat';
  const root = repoRoot();
  const networkEnvPath = join(root, 'deployments', `${network}.env`);
  const manifestPath = join(root, 'deployments', `${network}.contracts-manifest.json`);
  const env = await readEnv(networkEnvPath);
  let oldManifest = { contracts: {} };
  try { oldManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {
    // No previous manifest means every contract must be deployed once.
  }

  // Plan mode: read-only. Computes what an incremental run WOULD do (adopting the
  // live on-chain addresses from <network>.env, listing only genuinely-new
  // contracts) and writes just the fingerprint manifest. No signer, no txns, no
  // env/render writes — safe to run against a live deployment without a key.
  const planOnly = process.env.DEPLOY_PLAN_ONLY === '1';
  // With no manifest for an already-live deployment, adopt the existing on-chain
  // addresses as "reused" instead of redeploying them, so a first incremental run
  // only deploys new contracts. Always on in plan mode; opt into it for a real run
  // with ADOPT_EXISTING_DEPLOYMENT=1 (e.g. right after a plan/bootstrap).
  const adoptExisting = planOnly || process.env.ADOPT_EXISTING_DEPLOYMENT === '1';
  const wouldDeploy = [];

  const [deployer] = await ethers.getSigners();
  if (!deployer && !planOnly) throw new Error('No signer available: set DEPLOYER_PRIVATE_KEY for this network.');
  const deployerAddress = deployer ? deployer.address : '0x0000000000000000000000000000000000000000';
  const contractAdminAddress = isLocal
    ? deployerAddress
    : planOnly
      ? (env.CONTRACT_ADMIN_ADDRESS || process.env.CONTRACT_ADMIN_ADDRESS || deployerAddress)
      : requireAddress('CONTRACT_ADMIN_ADDRESS', process.env.CONTRACT_ADMIN_ADDRESS);
  if (!isLocal && !planOnly && contractAdminAddress === deployerAddress) throw new Error('CONTRACT_ADMIN_ADDRESS must be distinct from the deployer address for non-local deployments');

  console.log(`\n=== Incremental contract deployment to ${network}${planOnly ? ' (PLAN ONLY — read-only, no deploy)' : ''} ===\n`);
  console.log(`Deployer: ${deployerAddress}`);
  if (!isLocal) console.log(`Contract admin: ${contractAdminAddress}`);
  if (deployer) console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployerAddress))} ETH\n`);

  const addresses = {};
  const freshlyDeployed = new Set();
  const manifest = { network, deployer: deployerAddress, contractAdmin: contractAdminAddress, updatedAt: new Date().toISOString(), contracts: {} };
  let deployStartBlock = env.START_BLOCK || env.CONTENT_FUNDING_START_BLOCK || '';

  function adminCapable(contract) {
    if (isLocal) return contract;
    const adminPrivateKey = process.env.CONTRACT_ADMIN_PRIVATE_KEY?.trim();
    if (!adminPrivateKey) return contract;
    return contract.connect(new ethers.Wallet(adminPrivateKey, ethers.provider));
  }

  async function deployOrReuse(name, contractName, args = [], opts = {}) {
    const keys = ADDRESS_KEYS[name];
    const oldAddress = env[keys[0]];
    const fp = await fingerprint(contractName, args, opts.fingerprintExtra || []);
    const old = oldManifest.contracts?.[name];
    const codePresent = oldAddress && ethers.isAddress(oldAddress) && await hasCode(oldAddress);
    const fingerprintMatch = old?.fingerprint === fp;
    // Reuse when the manifest fingerprint matches, or (adopt mode) whenever a live
    // on-chain address exists — pinning it at the current fingerprint so later runs
    // treat it as unchanged.
    if (codePresent && (fingerprintMatch || adoptExisting)) {
      addresses[name] = ethers.getAddress(oldAddress);
      manifest.contracts[name] = { contractName, address: addresses[name], fingerprint: fp, reused: true, constructorArgs: args, ...(fingerprintMatch ? {} : { adopted: true }) };
      console.log(`↻ ${name}: ${fingerprintMatch ? 'unchanged' : 'ADOPTED from env'}, reusing ${addresses[name]}`);
      return addresses[name];
    }
    if (planOnly) {
      // Genuinely new (no live address to adopt): record the intent, deploy nothing.
      wouldDeploy.push(name);
      manifest.contracts[name] = { contractName, fingerprint: fp, reused: false, wouldDeploy: true, constructorArgs: args };
      console.log(`＋ ${name}: WOULD DEPLOY (no existing ${keys[0]} in ${network}.env)`);
      return null;
    }
    console.log(`Deploying ${name}...`);
    const Factory = await ethers.getContractFactory(contractName);
    const c = await Factory.deploy(...args);
    await c.waitForDeployment();
    const address = await c.getAddress();
    const receipt = await c.deploymentTransaction().wait();
    if (!deployStartBlock) deployStartBlock = String(receipt.blockNumber);
    addresses[name] = address;
    freshlyDeployed.add(name);
    manifest.contracts[name] = { contractName, address, fingerprint: fp, reused: false, constructorArgs: args, blockNumber: receipt.blockNumber, tx: c.deploymentTransaction().hash };
    console.log(`✓ ${name}: ${address} (block ${receipt.blockNumber})`);
    if (opts.after) await opts.after(c);
    return address;
  }

  await deployOrReuse('Beliefs', 'Beliefs');
  await deployOrReuse('Implications', 'Implications');
  await deployOrReuse('TrustRegistry', 'TrustRegistry');
  await deployOrReuse('AccountAssertions', 'AccountAssertions');
  await deployOrReuse('AlignmentAttestations', 'AlignmentAttestations');
  await deployOrReuse('NoteIntent', 'NoteIntent');
  await deployOrReuse('MutableRefUpdater', 'MutableRefUpdater');
  await deployOrReuse('AssuranceContractFactory', 'AssuranceContractFactory');
  await deployOrReuse('PremintingERC1155Factory', 'PremintingERC1155Factory');
  await deployOrReuse('MarketplaceFactory', 'MarketplaceFactory');
  await deployOrReuse('DelegatableNotes', 'DelegatableNotes', [addresses.AssuranceContractFactory, addresses.MarketplaceFactory]);
  await deployOrReuse('RecurringPledges', 'RecurringPledges', [addresses.DelegatableNotes]);
  if (freshlyDeployed.has('DelegatableNotes') || freshlyDeployed.has('RecurringPledges')) {
    const d = await ethers.getContractAt('DelegatableNotes', addresses.DelegatableNotes);
    if (ethers.getAddress(await d.recurringPledgeRegistry()) !== addresses.RecurringPledges) await (await d.setRecurringPledgeRegistry(addresses.RecurringPledges)).wait();
  }
  await deployOrReuse('ValueThresholdConditionFactory', 'ValueThresholdConditionFactory');
  await deployOrReuse('FreeERC20', 'FreeERC20', ['Test USD', 'USDZZZ', 6], { after: async (token) => {
    for (const signer of await ethers.getSigners()) await (await token.mintTo(signer.address, ethers.parseUnits('1000000', 6))).wait();
  }});
  const trusted = isLocal ? deployer.address : (process.env.CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS || deployer.address);
  await deployOrReuse('ChannelVerifier', 'ChannelVerifier', [trusted]);
  await deployOrReuse('ContentRegistry', 'ContentRegistry', [], {
    // ContentRegistry ownership is handed to CreatorAssuranceContractFactory.
    // If the future factory's implementation inputs change, redeploy the
    // registry too; otherwise a reused registry may still be owned by the old
    // factory contract, which cannot transfer ownership to the new one.
    fingerprintExtra: [
      (await fingerprint('CreatorAssuranceContractFactory', [], ['implementation-only'])),
      addresses.PremintingERC1155Factory,
      addresses.MarketplaceFactory,
      addresses.ValueThresholdConditionFactory,
      addresses.FreeERC20,
    ],
  });
  await deployOrReuse('ChannelRegistry', 'ChannelRegistry', [addresses.ChannelVerifier]);
  await deployOrReuse('ChannelEscrow', 'ChannelEscrow', [addresses.ChannelRegistry, addresses.FreeERC20]);
  await deployOrReuse('CreatorAssuranceContractFactory', 'CreatorAssuranceContractFactory', [addresses.ContentRegistry, addresses.ChannelRegistry, addresses.ChannelEscrow, addresses.PremintingERC1155Factory, addresses.MarketplaceFactory, addresses.ValueThresholdConditionFactory, addresses.FreeERC20, ':']);
  if (freshlyDeployed.has('ContentRegistry') || freshlyDeployed.has('CreatorAssuranceContractFactory')) {
    const c = await ethers.getContractAt('ContentRegistry', addresses.ContentRegistry);
    if (ethers.getAddress(await c.owner()) !== addresses.CreatorAssuranceContractFactory) await (await c.transferOwnership(addresses.CreatorAssuranceContractFactory)).wait();
  }
  if (freshlyDeployed.has('ChannelRegistry') || freshlyDeployed.has('CreatorAssuranceContractFactory')) {
    const c = adminCapable(await ethers.getContractAt('ChannelRegistry', addresses.ChannelRegistry));
    if (!(await c.authorizedFactories(addresses.CreatorAssuranceContractFactory))) await (await c.setFactoryAuthorization(addresses.CreatorAssuranceContractFactory, true)).wait();
  }
  if (freshlyDeployed.has('DelegatableNotes') || freshlyDeployed.has('CreatorAssuranceContractFactory')) {
    const d = adminCapable(await ethers.getContractAt('DelegatableNotes', addresses.DelegatableNotes));
    if (!(await d.authorizedPrimaryMarketFactories(addresses.CreatorAssuranceContractFactory))) await (await d.setPrimaryMarketFactoryAuthorization(addresses.CreatorAssuranceContractFactory, true)).wait();
  }
  await deployOrReuse('NudgePublications', 'NudgePublications');
  await deployOrReuse('ProjectFactory', 'ProjectFactory', [addresses.PremintingERC1155Factory, addresses.MarketplaceFactory, addresses.AssuranceContractFactory, addresses.ValueThresholdConditionFactory]);

  if (isLocal) {
    await deployOrReuse('SponsoredGasEntryPoint', 'MockEntryPoint');
  } else {
    const entryPointAddress = env.SPONSORED_GAS_ENTRY_POINT_ADDRESS || process.env.SPONSORED_GAS_ENTRY_POINT_ADDRESS;
    if (planOnly && !entryPointAddress?.trim()) {
      // Real run requires this external address; surface it as a gap, don't throw.
      wouldDeploy.push('SponsoredGasEntryPoint (needs SPONSORED_GAS_ENTRY_POINT_ADDRESS)');
      console.log('＋ SponsoredGasEntryPoint: MISSING SPONSORED_GAS_ENTRY_POINT_ADDRESS (required before a real deploy)');
    } else {
      addresses.SponsoredGasEntryPoint = requireAddress('SPONSORED_GAS_ENTRY_POINT_ADDRESS', entryPointAddress);
      manifest.contracts.SponsoredGasEntryPoint = {
        contractName: 'ExternalEntryPoint',
        address: addresses.SponsoredGasEntryPoint,
        reused: true,
      };
    }
  }
  const sponsoredGasMaxWeiPerWalletPerWindow = envBigInt(
    env,
    'SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW',
    ethers.parseEther('0.01'),
  );
  const sponsoredGasWalletWindowSeconds = envNumber(env, 'SPONSORED_GAS_WALLET_WINDOW_SECONDS', 3600);
  const minSponsoredContributionAmount = envBigInt(
    env,
    'MIN_SPONSORED_CONTRIBUTION_AMOUNT',
    ethers.parseUnits('1', 6),
  );
  await deployOrReuse('CreatorGasTank', 'CreatorGasTank', [
    addresses.SponsoredGasEntryPoint,
    addresses.FreeERC20,
    sponsoredGasMaxWeiPerWalletPerWindow,
    sponsoredGasWalletWindowSeconds,
    minSponsoredContributionAmount,
  ]);

  let needsAdminAcceptance = false;
  if (!isLocal && !planOnly) {
    for (const name of ['ChannelVerifier', 'ChannelRegistry']) {
      const c = await ethers.getContractAt(name, addresses[name]);
      if (ethers.getAddress(await c.owner()) !== contractAdminAddress) {
        const pending = ethers.getAddress(await c.pendingOwner());
        if (pending !== contractAdminAddress) await (await c.transferOwnership(contractAdminAddress)).wait();
        needsAdminAcceptance = true;
      }
    }
    const d = await ethers.getContractAt('DelegatableNotes', addresses.DelegatableNotes);
    if (ethers.getAddress(await d.owner()) !== contractAdminAddress) await (await d.transferOwnership(contractAdminAddress)).wait();
  }
  manifest.needsAdminAcceptance = needsAdminAcceptance;

  if (planOnly) {
    // Write only the reviewable fingerprint manifest; touch no env/render files.
    await fs.mkdir(join(root, 'deployments'), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    const adopted = Object.keys(manifest.contracts).filter((k) => manifest.contracts[k].reused);
    console.log(`\n=== PLAN ONLY — no contracts deployed, no env/render files written ===`);
    console.log(`Adopt & reuse (${adopted.length}): ${adopted.join(', ')}`);
    console.log(wouldDeploy.length ? `WOULD DEPLOY (${wouldDeploy.length}): ${wouldDeploy.join(', ')}` : 'WOULD DEPLOY: (none)');
    console.log(`Wrote ${manifestPath}`);
    console.log(`\nReview the manifest, then run the real deploy with ADOPT_EXISTING_DEPLOYMENT=1 + a funded DEPLOYER_PRIVATE_KEY.`);
    return;
  }

  const addressEntries = {
    BELIEFS_CONTRACT_ADDRESS: addresses.Beliefs,
    IMPLICATIONS_CONTRACT_ADDRESS: addresses.Implications,
    TRUST_REGISTRY_ADDRESS: addresses.TrustRegistry,
    ACCOUNT_ASSERTIONS_ADDRESS: addresses.AccountAssertions,
    ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: addresses.AlignmentAttestations,
    ALIGNMENT_ATTESTATIONS_ADDRESS: addresses.AlignmentAttestations,
    PROJECT_ALIGNMENT_CONTRACT_ADDRESS: addresses.AlignmentAttestations,
    NOTE_INTENT_ADDRESS: addresses.NoteIntent,
    DELEGATABLE_NOTES_CONTRACT_ADDRESS: addresses.DelegatableNotes,
    DELEGATABLE_NOTES_ADDRESS: addresses.DelegatableNotes,
    RECURRING_PLEDGES_CONTRACT_ADDRESS: addresses.RecurringPledges,
    RECURRING_PLEDGES_ADDRESS: addresses.RecurringPledges,
    MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: addresses.MutableRefUpdater,
    MUTABLE_REF_UPDATER_ADDRESS: addresses.MutableRefUpdater,
    ASSURANCE_CONTRACT_FACTORY_ADDRESS: addresses.AssuranceContractFactory,
    ERC1155_FACTORY_ADDRESS: addresses.PremintingERC1155Factory,
    MARKETPLACE_FACTORY_ADDRESS: addresses.MarketplaceFactory,
    ETH_THRESHOLD_CONDITION_FACTORY_ADDRESS: addresses.ValueThresholdConditionFactory,
    PAYMENT_TOKEN_ADDRESS: addresses.FreeERC20,
    PAYMENT_TOKEN_SYMBOL: 'USDZZZ',
    PAYMENT_TOKEN_DECIMALS: '6',
    PROJECT_FACTORY_ADDRESS: addresses.ProjectFactory,
    DEPLOYER_ADDRESS: deployer.address,
    CONTRACT_ADMIN_ADDRESS: contractAdminAddress,
    CHANNEL_VERIFIER_ADDRESS: addresses.ChannelVerifier,
    CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS: trusted,
    CONTENT_REGISTRY_ADDRESS: addresses.ContentRegistry,
    CHANNEL_REGISTRY_ADDRESS: addresses.ChannelRegistry,
    CHANNEL_ESCROW_ADDRESS: addresses.ChannelEscrow,
    CREATOR_CONTRACT_FACTORY_ADDRESS: addresses.CreatorAssuranceContractFactory,
    NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: addresses.NudgePublications,
    SPONSORED_GAS_ENTRY_POINT_ADDRESS: addresses.SponsoredGasEntryPoint,
    CREATOR_GAS_TANK_ADDRESS: addresses.CreatorGasTank,
    SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW: sponsoredGasMaxWeiPerWalletPerWindow.toString(),
    SPONSORED_GAS_WALLET_WINDOW_SECONDS: String(sponsoredGasWalletWindowSeconds),
    MIN_SPONSORED_CONTRIBUTION_AMOUNT: minSponsoredContributionAmount.toString(),
    CONTENT_FUNDING_START_BLOCK: String(deployStartBlock),
    START_BLOCK: String(deployStartBlock),
  };
  await fs.mkdir(join(root, 'deployments'), { recursive: true });
  await updateEnvFile(networkEnvPath, addressEntries);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  if (!isLocal) await fs.writeFile(join(process.cwd(), 'deployments', `${network}-${Date.now()}.json`), JSON.stringify({ ...manifest, contracts: Object.fromEntries(Object.entries(manifest.contracts).map(([k, v]) => [k, v.address])) }, null, 2));

  await updateEnvFile(join(root, '.env'), isLocal ? { ...addressEntries, IPFS_API: 'http://localhost:5001', IPFS_GATEWAY: 'http://localhost:8080/ipfs', EVENT_CACHE_URL: 'http://localhost:42069', VERIFIER_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', LOCAL_SEED_NUDGER_ADDRESS } : addressEntries);
  await updateEnvFile(join(root, 'integration-tests', '.env.local'), isLocal ? { ...addressEntries, IPFS_API: 'http://localhost:5001', IPFS_GATEWAY: 'http://localhost:8080/ipfs', EVENT_CACHE_URL: 'http://localhost:42069', VERIFIER_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', LOCAL_SEED_NUDGER_ADDRESS } : addressEntries);
  await updateEnvFile(join(root, 'ui', '.env'), {
    VITE_BELIEFS_CONTRACT_ADDRESS: addresses.Beliefs, VITE_IMPLICATIONS_CONTRACT_ADDRESS: addresses.Implications, VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: addresses.MutableRefUpdater,
    VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS: addresses.DelegatableNotes, VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS: addresses.RecurringPledges, VITE_NOTE_INTENT_CONTRACT_ADDRESS: addresses.NoteIntent,
    VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS: addresses.AssuranceContractFactory, VITE_ERC1155_FACTORY_ADDRESS: addresses.PremintingERC1155Factory, VITE_MARKETPLACE_FACTORY_ADDRESS: addresses.MarketplaceFactory,
    VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: addresses.AlignmentAttestations, VITE_TRUST_REGISTRY_CONTRACT_ADDRESS: addresses.TrustRegistry, VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: addresses.NudgePublications,
    VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS: addresses.AccountAssertions,
    VITE_CONTENT_REGISTRY_ADDRESS: addresses.ContentRegistry, VITE_CHANNEL_REGISTRY_ADDRESS: addresses.ChannelRegistry, VITE_CHANNEL_VERIFIER_ADDRESS: addresses.ChannelVerifier,
    VITE_CHANNEL_ESCROW_ADDRESS: addresses.ChannelEscrow, VITE_CREATOR_CONTRACT_FACTORY_ADDRESS: addresses.CreatorAssuranceContractFactory, VITE_PROJECT_FACTORY_CONTRACT_ADDRESS: addresses.ProjectFactory,
    VITE_CREATOR_GAS_TANK_ADDRESS: addresses.CreatorGasTank, VITE_SPONSORED_GAS_ENTRY_POINT_ADDRESS: addresses.SponsoredGasEntryPoint,
    VITE_PAYMENT_TOKEN_ADDRESS: addresses.FreeERC20, VITE_PAYMENT_TOKEN_SYMBOL: 'USDZZZ', VITE_PAYMENT_TOKEN_DECIMALS: '6', ...(isLocal ? { VITE_IPFS_GATEWAY: 'http://localhost:8080/ipfs', VITE_DEFAULT_NUDGERS: LOCAL_SEED_NUDGER_ADDRESS } : {})
  });
  await updateEnvFile(join(root, 'implication-attester', '.env'), { IMPLICATIONS_CONTRACT_ADDRESS: addresses.Implications });

  const changed = [...freshlyDeployed];
  console.log(`\n=== Incremental deployment complete ===`);
  console.log(changed.length ? `Deployed: ${changed.join(', ')}` : 'No contract deployments were necessary.');
  console.log(`Wrote ${networkEnvPath}`);
  console.log(`Wrote ${manifestPath}`);
  if (needsAdminAcceptance) console.log('Admin acceptance is needed for pending Ownable2Step transfers.');
}

main().catch((e) => { console.error(e); process.exit(1); });
