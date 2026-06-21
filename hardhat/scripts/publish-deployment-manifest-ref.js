#!/usr/bin/env node

/**
 * Publish the current deployment-manifest pointer through MutableRefUpdater.
 *
 * Usage:
 *   DEPLOYMENT_MANIFEST_REF=ipfs://bafy... npx hardhat run scripts/publish-deployment-manifest-ref.js --network base-sepolia
 *
 * Optional env:
 *   DEPLOYMENT_MANIFEST_REF_NAME=commonality.deployment-manifest
 *   MUTABLE_REF_UPDATER_ADDRESS=0x... (defaults to deployments/<network>.env)
 */

import hre from 'hardhat';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_REF_NAME = 'commonality.deployment-manifest';

function parseEnv(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^"|"$/g, '');
  }
  return result;
}

async function readDeploymentEnv(network) {
  const repoRoot = process.env.COMMONALITY_ROOT_DIR || path.join(process.cwd(), '..');
  const envPath = path.join(repoRoot, 'deployments', `${network}.env`);
  try {
    return parseEnv(await fs.readFile(envPath, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const manifestRef = process.env.DEPLOYMENT_MANIFEST_REF;
  if (!manifestRef) {
    throw new Error('DEPLOYMENT_MANIFEST_REF is required (for example ipfs://bafy...)');
  }

  const network = hre.network.name;
  const deploymentEnv = await readDeploymentEnv(network);
  const mutableRefUpdaterAddress =
    process.env.MUTABLE_REF_UPDATER_ADDRESS ||
    deploymentEnv.MUTABLE_REF_UPDATER_ADDRESS ||
    deploymentEnv.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS;

  if (!mutableRefUpdaterAddress || !hre.ethers.isAddress(mutableRefUpdaterAddress)) {
    throw new Error(`No valid MutableRefUpdater address configured for ${network}`);
  }

  const [publisher] = await hre.ethers.getSigners();
  const refName = process.env.DEPLOYMENT_MANIFEST_REF_NAME || DEFAULT_REF_NAME;
  const mutableRefUpdater = await hre.ethers.getContractAt('MutableRefUpdater', mutableRefUpdaterAddress);

  console.log(`Publishing ${refName} for ${publisher.address}`);
  console.log(`MutableRefUpdater: ${mutableRefUpdaterAddress}`);
  console.log(`Manifest ref: ${manifestRef}`);

  const tx = await mutableRefUpdater.connect(publisher).updateRef(refName, manifestRef);
  console.log(`Transaction: ${tx.hash}`);
  await tx.wait();
  console.log('Deployment manifest pointer published.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
