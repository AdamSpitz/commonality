/**
 * Accept pending Ownable2Step admin ownership transfers.
 *
 * Usage:
 *   CONTRACT_ADMIN_PRIVATE_KEY=0x... npx hardhat run scripts/accept-admin-ownership.js --network base-sepolia
 *
 * hardhat.config.cjs loads deployments/<network>.env, deployments/operator-addresses.env,
 * .env, and .env.secrets before this script runs. The admin private key is intentionally
 * not read from those files; provide it temporarily in the shell environment.
 */

import hre from 'hardhat';

const { ethers } = hre;

const OWNABLE_2_STEP_CONTRACTS = [
  ['ChannelVerifier', 'CHANNEL_VERIFIER_ADDRESS'],
  ['ChannelRegistry', 'CHANNEL_REGISTRY_ADDRESS'],
];

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function requireAddressEnv(key) {
  const value = requireEnv(key);
  if (!ethers.isAddress(value)) throw new Error(`${key} must be a valid Ethereum address; got ${value}`);
  return ethers.getAddress(value);
}

async function main() {
  const network = hre.network.name;
  const adminPrivateKey = requireEnv('CONTRACT_ADMIN_PRIVATE_KEY');
  const expectedAdmin = requireAddressEnv('CONTRACT_ADMIN_ADDRESS');
  const wallet = new ethers.Wallet(adminPrivateKey, ethers.provider);

  if (wallet.address !== expectedAdmin) {
    throw new Error(
      `CONTRACT_ADMIN_PRIVATE_KEY derives ${wallet.address}, but CONTRACT_ADMIN_ADDRESS is ${expectedAdmin}`
    );
  }

  console.log(`Accepting admin ownership on ${network}`);
  console.log(`Admin account: ${wallet.address}`);
  console.log(`Admin balance: ${ethers.formatEther(await ethers.provider.getBalance(wallet.address))} ETH\n`);

  for (const [name, envKey] of OWNABLE_2_STEP_CONTRACTS) {
    const address = requireAddressEnv(envKey);
    const contract = (await ethers.getContractAt(name, address)).connect(wallet);
    const owner = ethers.getAddress(await contract.owner());

    if (owner === wallet.address) {
      console.log(`✓ ${name} (${address}) already owned by admin`);
      continue;
    }

    const pendingOwner = ethers.getAddress(await contract.pendingOwner());
    if (pendingOwner !== wallet.address) {
      throw new Error(
        `${name} (${address}) pendingOwner is ${pendingOwner}, not admin ${wallet.address}; current owner is ${owner}`
      );
    }

    console.log(`Accepting ${name} ownership at ${address} (current owner: ${owner})...`);
    const tx = await contract.acceptOwnership();
    console.log(`  tx: ${tx.hash}`);
    await tx.wait();
    const newOwner = ethers.getAddress(await contract.owner());
    if (newOwner !== wallet.address) {
      throw new Error(`${name} acceptOwnership mined, but owner is now ${newOwner}`);
    }
    console.log(`✓ ${name} owner is now ${newOwner}`);
  }

  if (process.env.DELEGATABLE_NOTES_ADDRESS || process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS) {
    const delegatableNotesAddress = requireAddressEnv(
      process.env.DELEGATABLE_NOTES_ADDRESS ? 'DELEGATABLE_NOTES_ADDRESS' : 'DELEGATABLE_NOTES_CONTRACT_ADDRESS'
    );
    const delegatableNotes = await ethers.getContractAt('DelegatableNotes', delegatableNotesAddress);
    const owner = ethers.getAddress(await delegatableNotes.owner());
    if (owner !== wallet.address) {
      throw new Error(`DelegatableNotes (${delegatableNotesAddress}) owner is ${owner}, expected admin ${wallet.address}`);
    }
    console.log(`✓ DelegatableNotes (${delegatableNotesAddress}) already owned by admin`);
  }

  console.log('\nDone. You can now unset CONTRACT_ADMIN_PRIVATE_KEY.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
